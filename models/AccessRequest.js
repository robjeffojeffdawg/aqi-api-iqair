// models/AccessRequest.js
const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  useCase: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  apiKey: {
    type: String,
    sparse: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date
});

module.exports = mongoose.model('AccessRequest', accessRequestSchema);
