const express = require('express');
const router = express.Router();
const HistoricalReading = require('../models/HistoricalReading');

// POST /api/history/record
// Record a new historical reading
router.post('/record', async (req, res, next) => {
  try {
    const { location, source, aqi, pollutants, weather } = req.body;

    if (!location || !source || !aqi) {
      return res.status(400).json({
        error: 'Missing required fields: location, source, aqi'
      });
    }

    const reading = new HistoricalReading({
      location,
      source,
      aqi,
      pollutants: pollutants || {},
      weather: weather || {}
    });

    await reading.save();

    res.json({
      success: true,
      data: reading
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/history/location
// Get historical readings for a location
router.get('/location', async (req, res, next) => {
  try {
    const { lat, lon, days, maxDistance } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const daysBack = parseInt(days) || 7;
    const distance = parseInt(maxDistance) || 10;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const endDate = new Date();

    const readings = await HistoricalReading.getReadingsInRange(
      latitude,
      longitude,
      startDate,
      endDate,
      distance
    );

    res.json({
      success: true,
      data: {
        location: { lat: latitude, lon: longitude },
        period: { start: startDate, end: endDate, days: daysBack },
        count: readings.length,
        readings: readings
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/history/averages
// Get averaged data over time periods
router.get('/averages', async (req, res, next) => {
  try {
    const { lat, lon, period, days } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const periodType = period || 'hour';
    const daysBack = parseInt(days) || 7;

    const averages = await HistoricalReading.getAveragesByPeriod(
      latitude,
      longitude,
      periodType,
      daysBack
    );

    res.json({
      success: true,
      data: {
        location: { lat: latitude, lon: longitude },
        period: periodType,
        days: daysBack,
        count: averages.length,
        averages: averages
      }
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/history/batch
// Record multiple readings at once (for data collection jobs)
router.post('/batch', async (req, res, next) => {
  try {
    const { readings } = req.body;

    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({
        error: 'readings array is required'
      });
    }

    const result = await HistoricalReading.insertMany(readings);

    res.json({
      success: true,
      data: {
        inserted: result.length
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/history/stats
// Get statistics for a location
router.get('/stats', async (req, res, next) => {
  try {
    const { lat, lon, days } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const daysBack = parseInt(days) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const latRange = 10 / 111;
    const lonRange = 10 / (111 * Math.cos(latitude * Math.PI / 180));

    const stats = await HistoricalReading.aggregate([
      {
        $match: {
          'location.coordinates.lat': { $gte: latitude - latRange, $lte: latitude + latRange },
          'location.coordinates.lon': { $gte: longitude - lonRange, $lte: longitude + lonRange },
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          avgAQI: { $avg: '$aqi.us' },
          minAQI: { $min: '$aqi.us' },
          maxAQI: { $max: '$aqi.us' },
          totalReadings: { $sum: 1 },
          sources: { $addToSet: '$source' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        location: { lat: latitude, lon: longitude },
        period: { days: daysBack },
        stats: stats[0] || { avgAQI: 0, minAQI: 0, maxAQI: 0, totalReadings: 0, sources: [] }
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
