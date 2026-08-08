// models/ApiKey.js
const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'revoked', 'expired'],
    default: 'active'
  },
  requestsToday: {
    type: Number,
    default: 0
  },
  lastUsedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  revokedAt: Date
});

module.exports = mongoose.model('ApiKey', apiKeySchema);
