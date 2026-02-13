const { Reading } = require('../models');
const iqairService = require('./iqairService');

class HistoricalDataService {
  constructor() {
    this.isCollecting = false;
    this.intervalId = null;
  }

  // Start collecting data for a location
  async startCollection(city, state, country, intervalMinutes = 60) {
    if (this.isCollecting) {
      console.log('Data collection already running');
      return;
    }

    this.isCollecting = true;
    const intervalMs = intervalMinutes * 60 * 1000;

    // Collect immediately
    await this.collectData(city, state, country);

    // Then collect at intervals
    this.intervalId = setInterval(async () => {
      await this.collectData(city, state, country);
    }, intervalMs);

    console.log(`📊 Started collecting data for ${city} every ${intervalMinutes} minutes`);
  }

  // Stop collecting data
  stopCollection() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isCollecting = false;
      console.log('📊 Stopped data collection');
    }
  }

  // Collect a single data point
  async collectData(city, state, country) {
    try {
      const data = await iqairService.getCityData(city, state, country);

      const reading = new Reading({
        stationId: data.stationId,
        timestamp: new Date(),
        aqi: data.aqi.us,
        pollutants: data.pollutants,
        weather: data.weather
      });

      await reading.save();
      console.log(`✅ Saved reading for ${city}: AQI ${data.aqi.us}`);

    } catch (error) {
      console.error(`Error collecting data for ${city}:`, error.message);
    }
  }

  // Get historical data for a station
  async getHistory(stationId, startDate, endDate) {
    try {
      const query = { stationId };

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const readings = await Reading.find(query)
        .sort({ timestamp: -1 })
        .limit(1000);

      return readings;

    } catch (error) {
      console.error('Error fetching history:', error.message);
      throw error;
    }
  }

  // Get statistics for a time period
  async getStatistics(stationId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const readings = await Reading.find({
        stationId,
        timestamp: { $gte: startDate }
      }).sort({ timestamp: 1 });

      if (readings.length === 0) {
        return null;
      }

      const aqiValues = readings.map(r => r.aqi);
      
      return {
        count: readings.length,
        average: Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length),
        min: Math.min(...aqiValues),
        max: Math.max(...aqiValues),
        current: readings[readings.length - 1].aqi,
        startDate: readings[0].timestamp,
        endDate: readings[readings.length - 1].timestamp
      };

    } catch (error) {
      console.error('Error calculating statistics:', error.message);
      throw error;
    }
  }

  // Get hourly averages
  async getHourlyAverages(stationId, hours = 24) {
    try {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);

      const readings = await Reading.aggregate([
        {
          $match: {
            stationId,
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' },
              hour: { $hour: '$timestamp' }
            },
            avgAqi: { $avg: '$aqi' },
            count: { $sum: 1 },
            timestamp: { $first: '$timestamp' }
          }
        },
        {
          $sort: { timestamp: 1 }
        }
      ]);

      return readings.map(r => ({
        timestamp: r.timestamp,
        aqi: Math.round(r.avgAqi),
        count: r.count
      }));

    } catch (error) {
      console.error('Error calculating hourly averages:', error.message);
      throw error;
    }
  }

  // Clean old data (keep last N days)
  async cleanOldData(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await Reading.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`🗑️ Cleaned ${result.deletedCount} old readings`);
      return result.deletedCount;

    } catch (error) {
      console.error('Error cleaning old data:', error.message);
      throw error;
    }
  }
}

module.exports = new HistoricalDataService();
