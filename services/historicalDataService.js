const HistoricalReading = require('../models/HistoricalReading');

class HistoricalDataService {
  constructor() {
    this.isRecording = false;
  }

  // Record a station reading to history
  async recordReading(station) {
    try {
      const reading = new HistoricalReading({
        location: {
          name: station.name,
          coordinates: {
            lat: station.coordinates.lat,
            lon: station.coordinates.lon
          },
          city: station.city,
          state: station.state,
          country: station.country
        },
        source: station.source || 'IQAir',
        aqi: {
          us: station.aqi.us,
          cn: station.aqi.cn
        },
        pollutants: station.pollutants || {},
        weather: station.weather || {}
      });

      await reading.save();
      console.log(`✅ Recorded historical reading for ${station.name}`);
      return reading;

    } catch (error) {
      console.error('❌ Error recording historical reading:', error.message);
      throw error;
    }
  }

  // Record multiple readings at once
  async recordBatch(stations) {
    try {
      const readings = stations.map(station => ({
        location: {
          name: station.name,
          coordinates: {
            lat: station.coordinates.lat,
            lon: station.coordinates.lon
          },
          city: station.city,
          state: station.state,
          country: station.country
        },
        source: station.source || 'IQAir',
        aqi: {
          us: station.aqi.us,
          cn: station.aqi.cn
        },
        pollutants: station.pollutants || {},
        weather: station.weather || {}
      }));

      const result = await HistoricalReading.insertMany(readings);
      console.log(`✅ Recorded ${result.length} historical readings`);
      return result;

    } catch (error) {
      console.error('❌ Error recording batch:', error.message);
      throw error;
    }
  }

  // Start automatic recording (optional - can be enabled via env var)
  startAutoRecording(intervalMinutes = 60) {
    if (this.isRecording) {
      console.log('⚠️ Auto-recording already running');
      return;
    }

    if (process.env.ENABLE_AUTO_RECORDING !== 'true') {
      console.log('ℹ️ Auto-recording disabled (set ENABLE_AUTO_RECORDING=true to enable)');
      return;
    }

    this.isRecording = true;
    console.log(`🔄 Starting auto-recording every ${intervalMinutes} minutes`);

    // Initial recording
    this.recordPopularLocations();

    // Set interval
    this.recordingInterval = setInterval(() => {
      this.recordPopularLocations();
    }, intervalMinutes * 60 * 1000);
  }

  // Stop automatic recording
  stopAutoRecording() {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.isRecording = false;
      console.log('⏹️ Auto-recording stopped');
    }
  }

  // Record data for popular locations (can be customized)
  async recordPopularLocations() {
    // Example locations - customize this list
    const locations = [
      { lat: 40.7128, lon: -74.0060, name: 'New York' },
      { lat: 34.0522, lon: -118.2437, name: 'Los Angeles' },
      { lat: 51.5074, lon: -0.1278, name: 'London' },
      { lat: 35.6762, lon: 139.6503, name: 'Tokyo' }
    ];

    for (const location of locations) {
      try {
        // This would call your AQI services to get current data
        // For now, this is a placeholder
        console.log(`Recording data for ${location.name}...`);
      } catch (error) {
        console.error(`Failed to record ${location.name}:`, error.message);
      }
    }
  }

  // Cleanup old data
  async cleanupOldData(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await HistoricalReading.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`🗑️ Cleaned up ${result.deletedCount} old readings (older than ${daysToKeep} days)`);
      return result.deletedCount;

    } catch (error) {
      console.error('❌ Error cleaning up old data:', error.message);
      throw error;
    }
  }
}

module.exports = new HistoricalDataService();
