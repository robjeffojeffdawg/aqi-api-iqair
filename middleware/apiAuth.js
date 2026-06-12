// middleware/apiAuth.js
const Subscription = require('../models/Subscription');
const redis = require('redis');

// Optional: Redis for distributed rate limiting (use if you have multiple server instances)
// const redisClient = redis.createClient(process.env.REDIS_URL);

class APIAuth {
  /**
   * Validate API key and attach subscription to request
   */
  static async validateAPIKey(req, res, next) {
    try {
      // Get API key from header or query
      const apiKey = 
        req.headers['x-api-key'] || 
        req.headers['authorization']?.replace('Bearer ', '') ||
        req.query.api_key;

      if (!apiKey) {
        return res.status(401).json({
          error: 'Missing API key. Provide via X-API-Key header or api_key query param'
        });
      }

      // Look up subscription
      const subscription = await Subscription.findOne({ apiKey });
      if (!subscription) {
        return res.status(401).json({
          error: 'Invalid API key'
        });
      }

      // Check if subscription is active
      if (subscription.status === 'canceled') {
        return res.status(403).json({
          error: 'Subscription has been canceled'
        });
      }

      if (subscription.status === 'past_due') {
        return res.status(402).json({
          error: 'Payment failed. Please update payment method in Stripe portal'
        });
      }

      // Attach subscription to request
      req.subscription = subscription;
      req.apiKey = apiKey;

      next();
    } catch (error) {
      console.error('API key validation error:', error);
      res.status(500).json({ error: 'Authentication error' });
    }
  }

  /**
   * Check rate limit for API key
   */
  static async checkRateLimit(req, res, next) {
    try {
      const subscription = req.subscription;
      if (!subscription) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Reset monthly usage if needed
      subscription.resetMonthlyUsageIfNeeded();

      // Check if over quota
      if (subscription.isOverQuota()) {
        return res.status(429).json({
          error: 'Monthly quota exceeded',
          requestsUsed: subscription.requestsUsedThisMonth,
          requestsLimit: subscription.rateLimit.requestsPerMonth,
          resetDate: subscription.monthResetDate,
          message: 'Upgrade your plan to increase limits'
        });
      }

      // Check per-second rate limit
      const now = Date.now();
      const key = `rate:${subscription.apiKey}:${Math.floor(now / 1000)}`;

      // Get current second counter from memory (in-app)
      if (!global.rateLimitCounters) {
        global.rateLimitCounters = {};
      }

      const currentCount = (global.rateLimitCounters[key] || 0) + 1;
      global.rateLimitCounters[key] = currentCount;

      // Clean old counters (older than 2 seconds)
      const now_sec = Math.floor(now / 1000);
      for (const k in global.rateLimitCounters) {
        const ts = parseInt(k.split(':')[2]);
        if (now_sec - ts > 2) {
          delete global.rateLimitCounters[k];
        }
      }

      if (currentCount > subscription.rateLimit.requestsPerSecond) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          limit: subscription.rateLimit.requestsPerSecond,
          requestsPerSecond: subscription.rateLimit.requestsPerSecond,
          retryAfter: 1
        });
      }

      // Increment monthly counter
      subscription.requestsUsedThisMonth += 1;
      await subscription.save();

      // Attach rate limit info to response
      res.set('X-RateLimit-Limit', subscription.rateLimit.requestsPerSecond);
      res.set('X-RateLimit-Remaining', subscription.rateLimit.requestsPerSecond - currentCount);
      res.set('X-RateLimit-Reset', Math.floor(now / 1000) + 1);

      next();
    } catch (error) {
      console.error('Rate limit check error:', error);
      res.status(500).json({ error: 'Rate limit error' });
    }
  }

  /**
   * Optional: Check subscription status (middle of request)
   */
  static async checkSubscriptionStatus(req, res, next) {
    try {
      const subscription = req.subscription;
      if (!subscription) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Add subscription info to response headers
      res.set('X-Plan', subscription.plan);
      res.set('X-Requests-Used', subscription.requestsUsedThisMonth);
      res.set('X-Requests-Limit', subscription.rateLimit.requestsPerMonth);

      next();
    } catch (error) {
      console.error('Subscription check error:', error);
      res.status(500).json({ error: 'Subscription error' });
    }
  }
}

module.exports = APIAuth;
