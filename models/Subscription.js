// models/Subscription.js
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  // User Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },

  // Stripe Information
  stripeCustomerId: {
    type: String,
    required: true,
    unique: true
  },
  stripeSubscriptionId: {
    type: String,
    sparse: true
  },
  stripePriceId: {
    type: String,
    required: true
  },

  // Plan Information
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },

  // Rate Limits (based on plan)
  rateLimit: {
    requestsPerMonth: {
      type: Number,
      default: 100
    },
    requestsPerSecond: {
      type: Number,
      default: 1
    }
  },

  // API Key
  apiKey: {
    type: String,
    required: true,
    unique: true,
    sparse: true
  },

  // Subscription Status
  status: {
    type: String,
    enum: ['active', 'past_due', 'canceled', 'unpaid'],
    default: 'active'
  },

  // Billing Dates
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  canceledAt: Date,

  // Usage Tracking
  requestsUsedThisMonth: {
    type: Number,
    default: 0
  },
  monthResetDate: {
    type: Date,
    default: () => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
  },

  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  notes: String,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for fast lookups
subscriptionSchema.index({ email: 1 });
subscriptionSchema.index({ apiKey: 1 });
subscriptionSchema.index({ stripeCustomerId: 1 });

// Auto-update timestamp
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Reset usage at start of month
subscriptionSchema.methods.resetMonthlyUsageIfNeeded = function() {
  const now = new Date();
  if (now >= this.monthResetDate) {
    this.requestsUsedThisMonth = 0;
    this.monthResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
};

// Check if over quota
subscriptionSchema.methods.isOverQuota = function() {
  return this.requestsUsedThisMonth >= this.rateLimit.requestsPerMonth;
};

// Get plan details
subscriptionSchema.statics.getPlanDetails = function(plan) {
  const plans = {
    free: {
      name: 'Free',
      requestsPerMonth: 100,
      requestsPerSecond: 1,
      price: 0
    },
    pro: {
      name: 'Pro',
      requestsPerMonth: 10000,
      requestsPerSecond: 10,
      price: 999 // $9.99 in cents
    },
    enterprise: {
      name: 'Enterprise',
      requestsPerMonth: Infinity,
      requestsPerSecond: 100,
      price: 0 // Custom pricing
    }
  };
  return plans[plan] || plans.free;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
