// services/stripeService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');
const { v4: uuidv4 } = require('uuid');

class StripeService {
  /**
   * Create a new customer in Stripe
   */
  async createCustomer(email, name) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          source: 'aqi-api',
          createdAt: new Date().toISOString()
        }
      });
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Get customer by email
   */
  async getCustomerByEmail(email) {
    try {
      const customers = await stripe.customers.list({
        email,
        limit: 1
      });
      return customers.data[0] || null;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(customerId, priceId) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent']
      });
      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId) {
    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription (change price)
   */
  async updateSubscription(subscriptionId, newPriceId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      // Get the current item
      const item = subscription.items.data[0];
      
      // Update to new price
      const updated = await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: item.id,
            price: newPriceId
          }
        ],
        proration_behavior: 'always_invoice' // Charge difference immediately
      });
      
      return updated;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId) {
    try {
      return await stripe.subscriptions.del(subscriptionId);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Create a checkout session
   */
  async createCheckoutSession(customerId, priceId, successUrl, cancelUrl) {
    try {
      return await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_update: {
          address: 'auto'
        }
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Get customer portal session
   */
  async createPortalSession(customerId, returnUrl) {
    try {
      return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw error;
    }
  }

  /**
   * Get invoices for customer
   */
  async getInvoices(customerId, limit = 10) {
    try {
      return await stripe.invoices.list({
        customer: customerId,
        limit
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event) {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          return await this.handleSubscriptionCreated(event.data.object);
        
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(event.data.object);
        
        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(event.data.object);
        
        case 'invoice.payment_succeeded':
          return await this.handleInvoicePaid(event.data.object);
        
        case 'invoice.payment_failed':
          return await this.handleInvoiceFailed(event.data.object);
        
        case 'charge.refunded':
          return await this.handleRefund(event.data.object);
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Handle subscription created
   */
  async handleSubscriptionCreated(subscription) {
    const customer = await stripe.customers.retrieve(subscription.customer);
    
    // Get plan from price
    const priceId = subscription.items.data[0].price.id;
    const plan = this.getPlanFromPrice(priceId);

    // Generate API key
    const apiKey = `aqi_${uuidv4()}`;

    // Create subscription record
    const sub = new Subscription({
      email: customer.email,
      name: customer.name,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan,
      apiKey,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      ...this.getRateLimitForPlan(plan)
    });

    await sub.save();
    console.log(`✅ Subscription created: ${customer.email} (${plan})`);
    
    return { apiKey, plan };
  }

  /**
   * Handle subscription updated (plan change, etc)
   */
  async handleSubscriptionUpdated(subscription) {
    const customer = await stripe.customers.retrieve(subscription.customer);
    const priceId = subscription.items.data[0].price.id;
    const newPlan = this.getPlanFromPrice(priceId);

    const sub = await Subscription.findOne({
      stripeSubscriptionId: subscription.id
    });

    if (sub) {
      sub.plan = newPlan;
      sub.stripePriceId = priceId;
      sub.status = subscription.status;
      sub.currentPeriodStart = new Date(subscription.current_period_start * 1000);
      sub.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      
      // Update rate limits
      const limits = this.getRateLimitForPlan(newPlan);
      sub.rateLimit = limits.rateLimit;

      await sub.save();
      console.log(`✅ Subscription updated: ${customer.email} → ${newPlan}`);
    }
  }

  /**
   * Handle subscription canceled
   */
  async handleSubscriptionDeleted(subscription) {
    const sub = await Subscription.findOne({
      stripeSubscriptionId: subscription.id
    });

    if (sub) {
      sub.status = 'canceled';
      sub.canceledAt = new Date();
      await sub.save();
      console.log(`✅ Subscription canceled: ${sub.email}`);
    }
  }

  /**
   * Handle invoice paid
   */
  async handleInvoicePaid(invoice) {
    const sub = await Subscription.findOne({
      stripeCustomerId: invoice.customer
    });

    if (sub) {
      sub.status = 'active';
      await sub.save();
      console.log(`✅ Invoice paid: ${sub.email}`);
    }
  }

  /**
   * Handle invoice payment failed
   */
  async handleInvoiceFailed(invoice) {
    const sub = await Subscription.findOne({
      stripeCustomerId: invoice.customer
    });

    if (sub) {
      sub.status = 'past_due';
      await sub.save();
      console.log(`⚠️  Payment failed: ${sub.email}`);
      
      // TODO: Send email to customer about failed payment
    }
  }

  /**
   * Handle refund
   */
  async handleRefund(charge) {
    console.log(`💰 Refund processed: ${charge.id}`);
    // TODO: Handle refund logic (reset monthly usage, etc)
  }

  // ────────────────── HELPER METHODS ──────────────────

  /**
   * Map price ID to plan name
   */
  getPlanFromPrice(priceId) {
    const priceMap = {
      [process.env.STRIPE_PRICE_FREE]: 'free',
      [process.env.STRIPE_PRICE_PRO]: 'pro',
      [process.env.STRIPE_PRICE_ENTERPRISE]: 'enterprise'
    };
    return priceMap[priceId] || 'free';
  }

  /**
   * Get rate limits for plan
   */
  getRateLimitForPlan(plan) {
    const limits = {
      free: {
        rateLimit: {
          requestsPerMonth: 100,
          requestsPerSecond: 1
        }
      },
      pro: {
        rateLimit: {
          requestsPerMonth: 10000,
          requestsPerSecond: 10
        }
      },
      enterprise: {
        rateLimit: {
          requestsPerMonth: Infinity,
          requestsPerSecond: 100
        }
      }
    };
    return limits[plan] || limits.free;
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(body, signature) {
    try {
      return stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw error;
    }
  }
}

module.exports = new StripeService();
