// routes/billing.js
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeService = require('../services/stripeService');
const Subscription = require('../models/Subscription');

const router = express.Router();

/**
 * POST /billing/webhook
 * Handle Stripe webhook events
 */
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  try {
    const event = stripeService.verifyWebhookSignature(
      req.body,
      signature
    );

    // Process event
    await stripeService.handleWebhookEvent(event);
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

/**
 * POST /billing/create-checkout
 * Create Stripe checkout session
 * Body: { email, name, planId, successUrl, cancelUrl }
 */
router.post('/create-checkout', async (req, res) => {
  try {
    const { email, name, planId, successUrl, cancelUrl } = req.body;

    if (!email || !name || !planId) {
      return res.status(400).json({
        error: 'Missing required fields: email, name, planId'
      });
    }

    // Get or create customer
    let customer = await stripeService.getCustomerByEmail(email);
    if (!customer) {
      customer = await stripeService.createCustomer(email, name);
    }

    // Map plan to price ID
    const priceMap = {
      'free': process.env.STRIPE_PRICE_FREE,
      'pro': process.env.STRIPE_PRICE_PRO,
      'enterprise': process.env.STRIPE_PRICE_ENTERPRISE
    };

    const priceId = priceMap[planId];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    // Create checkout session
    const session = await stripeService.createCheckoutSession(
      customer.id,
      priceId,
      successUrl,
      cancelUrl
    );

    res.json({
      sessionId: session.id,
      customerId: customer.id,
      url: session.url
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /billing/customer-portal
 * Create Stripe Customer Portal session
 * Body: { customerId, returnUrl }
 */
router.post('/customer-portal', async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;

    if (!customerId || !returnUrl) {
      return res.status(400).json({
        error: 'Missing required fields: customerId, returnUrl'
      });
    }

    const session = await stripeService.createPortalSession(
      customerId,
      returnUrl
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /billing/subscription/:apiKey
 * Get subscription details by API key
 */
router.get('/subscription/:apiKey', async (req, res) => {
  try {
    const { apiKey } = req.params;

    const subscription = await Subscription.findOne({ apiKey });
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({
      email: subscription.email,
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      requestsUsedThisMonth: subscription.requestsUsedThisMonth,
      rateLimit: subscription.rateLimit,
      stripeCustomerId: subscription.stripeCustomerId
    });
  } catch (error) {
    console.error('Subscription lookup error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /billing/upgrade
 * Upgrade subscription to different plan
 * Body: { apiKey, newPlanId }
 */
router.post('/upgrade', async (req, res) => {
  try {
    const { apiKey, newPlanId } = req.body;

    const subscription = await Subscription.findOne({ apiKey });
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active Stripe subscription' });
    }

    // Map plan to price ID
    const priceMap = {
      'free': process.env.STRIPE_PRICE_FREE,
      'pro': process.env.STRIPE_PRICE_PRO,
      'enterprise': process.env.STRIPE_PRICE_ENTERPRISE
    };

    const newPriceId = priceMap[newPlanId];
    if (!newPriceId) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    // Update Stripe subscription
    await stripeService.updateSubscription(
      subscription.stripeSubscriptionId,
      newPriceId
    );

    res.json({ 
      message: 'Subscription upgraded',
      newPlan: newPlanId
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /billing/cancel
 * Cancel subscription
 * Body: { apiKey }
 */
router.post('/cancel', async (req, res) => {
  try {
    const { apiKey } = req.body;

    const subscription = await Subscription.findOne({ apiKey });
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active Stripe subscription' });
    }

    // Cancel Stripe subscription
    await stripeService.cancelSubscription(subscription.stripeSubscriptionId);

    res.json({ message: 'Subscription canceled' });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /billing/invoices/:apiKey
 * Get invoices for subscription
 */
router.get('/invoices/:apiKey', async (req, res) => {
  try {
    const { apiKey } = req.params;

    const subscription = await Subscription.findOne({ apiKey });
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const invoices = await stripeService.getInvoices(
      subscription.stripeCustomerId
    );

    res.json({
      count: invoices.data.length,
      invoices: invoices.data.map(invoice => ({
        id: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        date: new Date(invoice.created * 1000),
        status: invoice.status,
        pdfUrl: invoice.invoice_pdf
      }))
    });
  } catch (error) {
    console.error('Invoices error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /billing/plans
 * Get all available plans
 */
router.get('/plans', (req, res) => {
  const plans = {
    free: {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      price: '$0/month',
      requestsPerMonth: 100,
      requestsPerSecond: 1,
      features: [
        '100 requests/month',
        '1 request/second',
        'Email support',
        'Basic rate limiting'
      ]
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      description: 'For serious projects',
      price: '$9.99/month',
      requestsPerMonth: 10000,
      requestsPerSecond: 10,
      features: [
        '10,000 requests/month',
        '10 requests/second',
        'Priority email support',
        '90-day data retention',
        'Advanced rate limiting'
      ]
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For high-volume users',
      price: 'Custom',
      requestsPerMonth: Infinity,
      requestsPerSecond: 100,
      features: [
        'Unlimited requests',
        '100 requests/second',
        'Dedicated support',
        'Custom data retention',
        'SLA guarantee',
        'Custom integrations'
      ]
    }
  };

  res.json({ plans: Object.values(plans) });
});

/**
 * GET /billing/usage/:apiKey
 * Get current usage for API key
 */
router.get('/usage/:apiKey', async (req, res) => {
  try {
    const { apiKey } = req.params;

    const subscription = await Subscription.findOne({ apiKey });
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Reset usage if new month
    subscription.resetMonthlyUsageIfNeeded();

    const percentageUsed = Math.round(
      (subscription.requestsUsedThisMonth / subscription.rateLimit.requestsPerMonth) * 100
    );

    res.json({
      plan: subscription.plan,
      requestsUsed: subscription.requestsUsedThisMonth,
      requestsLimit: subscription.rateLimit.requestsPerMonth,
      percentageUsed,
      monthResetDate: subscription.monthResetDate,
      isOverQuota: subscription.isOverQuota()
    });
  } catch (error) {
    console.error('Usage error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
