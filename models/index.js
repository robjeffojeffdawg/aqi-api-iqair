const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

// Favorite Location Schema
const favoriteLocationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  coordinates: {
    lat: { type: Number, required: true },
    lon: { type: Number, required: true }
  },
  stationId: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Alert Schema
const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FavoriteLocation'
  },
  threshold: {
    type: Number,
    required: true,
    min: 0
  },
  pollutant: {
    type: String,
    enum: ['pm25', 'pm10', 'aqi'],
    default: 'aqi'
  },
  enabled: {
    type: Boolean,
    default: true
  },
  notificationMethod: {
    type: String,
    enum: ['email', 'push', 'sms'],
    default: 'email'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Historical Reading Schema (for storing your own data)
const readingSchema = new mongoose.Schema({
  stationId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  aqi: {
    type: Number,
    required: true
  },
  pollutants: {
    pm25: Number,
    pm10: Number,
    o3: Number,
    no2: Number,
    so2: Number,
    co: Number
  },
  weather: {
    temperature: Number,
    humidity: Number,
    pressure: Number,
    wind: Number
  }
});

// Indexes
readingSchema.index({ stationId: 1, timestamp: -1 });
favoriteLocationSchema.index({ userId: 1 });
alertSchema.index({ userId: 1, enabled: 1 });

const User = mongoose.model('User', userSchema);
const FavoriteLocation = mongoose.model('FavoriteLocation', favoriteLocationSchema);
const Alert = mongoose.model('Alert', alertSchema);
const Reading = mongoose.model('Reading', readingSchema);

module.exports = {
  User,
  FavoriteLocation,
  Alert,
  Reading
};
