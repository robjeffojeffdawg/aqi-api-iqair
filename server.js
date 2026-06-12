// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

// Services & Middleware
const APIAuth = require('./middleware/apiAuth');

// Routes
const aqiRoutes = require('./routes/aqi');
const billingRoutes = require('./routes/billing');
const historyRoutes = require('./routes/history');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// ═══════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════

// Security
app.use(helmet());

// Logging
app.use(morgan('combined'));

// CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://aqi.jeff-o-blogs.com',
    'https://www.aqi.jeff-o-blogs.com'
  ],
  credentials: true
}));

// Body parsing (except webhook which needs raw)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy (for Railway)
app.set('trust proxy', 1);

// ═══════════════════════════════════════════════════════════
// DATABASE CONNECTION
// ═══════════════════════════════════════════════════════════

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// ═══════════════════════════════════════════════════════════
// PUBLIC ROUTES (No Auth Required)
// ═══════════════════════════════════════════════════════════

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: 'ok',
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing'
    }
  });
});

/**
 * API Info
 */
app.get('/api/aqi/sources', (req, res) => {
  res.json({
    success: true,
    data: {
      sources: [
        {
          name: 'IQAir',
          available: true,
          description: 'Professional air quality monitoring stations worldwide',
          features: ['City lookup', 'Countries/States/Cities', 'Weather data']
        },
        {
          name: 'PurpleAir',
          available: !!process.env.PURPLEAIR_API_KEY,
          description: 'Community-operated air quality sensors',
          features: ['Real-time PM2.5', 'High sensor density', 'Neighborhood-level data']
        },
        {
          name: 'OpenAQ',
          available: !!process.env.OPENAQ_API_KEY,
          description: 'DEFRA + global government monitoring networks',
          features: ['UK/Europe coverage', 'DEFRA stations', 'Fallback coverage']
        }
      ]
    }
  });
});

/**
 * Billing routes (public - for checkout, plans info)
 */
app.use('/billing', billingRoutes);

/**
 * Pricing page data
 */
app.get('/pricing', (req, res) => {
  res.json({
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: '$0/month',
        requests: '100/month',
        rateLimit: '1 req/s',
        features: ['100 requests/month', '1 request/second', 'Email support']
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$9.99/month',
        requests: '10,000/month',
        rateLimit: '10 req/s',
        features: ['10,000 requests/month', '10 requests/second', 'Priority support', '90-day retention']
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        requests: 'Unlimited',
        rateLimit: '100 req/s',
        features: ['Unlimited requests', '100 requests/second', 'Dedicated support', 'SLA guarantee']
      }
    ]
  });
});

// ═══════════════════════════════════════════════════════════
// PROTECTED ROUTES (API Key Required)
// ═══════════════════════════════════════════════════════════

// Apply authentication to all /api routes
app.use('/api', APIAuth.validateAPIKey);
app.use('/api', APIAuth.checkRateLimit);
app.use('/api', APIAuth.checkSubscriptionStatus);

// AQI routes
app.use('/api/aqi', aqiRoutes);

// History routes
app.use('/api', historyRoutes);

// Analytics routes
app.use('/api', analyticsRoutes);

/**
 * GET /api/account
 * Get account info
 */
app.get('/api/account', (req, res) => {
  const subscription = req.subscription;
  
  res.json({
    email: subscription.email,
    plan: subscription.plan,
    status: subscription.status,
    apiKey: subscription.apiKey,
    requestsUsedThisMonth: subscription.requestsUsedThisMonth,
    requestsLimit: subscription.rateLimit.requestsPerMonth,
    rateLimit: subscription.rateLimit,
    createdAt: subscription.createdAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
    stripeCustomerId: subscription.stripeCustomerId
  });
});

/**
 * POST /api/reset-usage (Admin only - optional)
 */
app.post('/api/reset-usage', async (req, res) => {
  try {
    const subscription = req.subscription;
    
    // Only allow if monthly period has reset
    const now = new Date();
    if (now >= subscription.monthResetDate) {
      subscription.requestsUsedThisMonth = 0;
      subscription.monthResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await subscription.save();
      
      res.json({ message: 'Usage reset' });
    } else {
      res.status(400).json({ error: 'Cannot reset usage mid-month' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
    message: 'Check documentation at aqi.jeff-o-blogs.com/api'
  });
});

/**
 * Global error handler
 */
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ═══════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  🌍 AQI Monitor API                        ║
║  💰 Powered by Stripe                      ║
║  🚀 Server running on port ${PORT}             ║
╚════════════════════════════════════════════╝

📚 Documentation: https://aqi.jeff-o-blogs.com/api
💳 Billing: https://dashboard.stripe.com
🔑 Webhook: POST /billing/webhook

NODE_ENV: ${process.env.NODE_ENV || 'development'}
Database: ${process.env.MONGODB_URI ? 'Connected' : 'Disconnected'}
Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Missing'}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;
