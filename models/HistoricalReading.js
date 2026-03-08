const mongoose = require('mongoose');

const historicalReadingSchema = new mongoose.Schema({
  location: {
    name: {
      type: String,
      required: true
    },
    coordinates: {
      lat: {
        type: Number,
        required: true
      },
      lon: {
        type: Number,
        required: true
      }
    },
    city: String,
    state: String,
    country: String
  },
  source: {
    type: String,
    required: true,
    enum: ['IQAir', 'PurpleAir']
  },
  aqi: {
    us: {
      type: Number,
      required: true
    },
    cn: Number
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
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
historicalReadingSchema.index({ timestamp: -1 });
historicalReadingSchema.index({ 'location.coordinates.lat': 1, 'location.coordinates.lon': 1 });
historicalReadingSchema.index({ 'location.name': 1, timestamp: -1 });

// Method to get readings for a location within a time range
historicalReadingSchema.statics.getReadingsInRange = async function(lat, lon, startDate, endDate, maxDistance = 10) {
  // Find readings within roughly maxDistance km
  const latRange = maxDistance / 111; // Rough conversion: 1 degree = ~111km
  const lonRange = maxDistance / (111 * Math.cos(lat * Math.PI / 180));
  
  return this.find({
    'location.coordinates.lat': { $gte: lat - latRange, $lte: lat + latRange },
    'location.coordinates.lon': { $gte: lon - lonRange, $lte: lon + lonRange },
    timestamp: { $gte: startDate, $lte: endDate }
  }).sort({ timestamp: 1 }).lean();
};

// Method to get average AQI over time periods
historicalReadingSchema.statics.getAveragesByPeriod = async function(lat, lon, period = 'hour', days = 7) {
  const latRange = 10 / 111;
  const lonRange = 10 / (111 * Math.cos(lat * Math.PI / 180));
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const groupFormat = period === 'hour' 
    ? { year: { $year: '$timestamp' }, month: { $month: '$timestamp' }, day: { $dayOfMonth: '$timestamp' }, hour: { $hour: '$timestamp' } }
    : { year: { $year: '$timestamp' }, month: { $month: '$timestamp' }, day: { $dayOfMonth: '$timestamp' } };
  
  return this.aggregate([
    {
      $match: {
        'location.coordinates.lat': { $gte: lat - latRange, $lte: lat + latRange },
        'location.coordinates.lon': { $gte: lon - lonRange, $lte: lon + lonRange },
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: groupFormat,
        // In getAveragesByPeriod method, change:
avgAQI: { $avg: { $ifNull: ['$aqi.us', '$aqi'] } },  // Fallback to $aqi if $aqi.us missing
minAQI: { $min: { $ifNull: ['$aqi.us', '$aqi'] } },
maxAQI: { $max: { $ifNull: ['$aqi.us', '$aqi'] } },
        count: { $sum: 1 },
        sources: { $addToSet: '$source' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
    }
  ]);
};

const HistoricalReading = mongoose.model('HistoricalReading', historicalReadingSchema);

module.exports = HistoricalReading;
