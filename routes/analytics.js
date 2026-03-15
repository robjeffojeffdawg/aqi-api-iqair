const express = require('express');
const router = express.Router();
const HistoricalReading = require('../models/HistoricalReading');

// GET /api/analytics/overview
// Get high-level statistics for dashboard
router.get('/overview', async (req, res, next) => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // Total data points
    const totalPoints = await HistoricalReading.countDocuments();
    
    // Data points this month
    const thisMonth = await HistoricalReading.countDocuments({
      timestamp: { $gte: lastMonth }
    });

    // Unique cities tracked
    const cities = await HistoricalReading.distinct('location.name');

    // Data sources
    const sources = await HistoricalReading.distinct('source');

    // Average AQI last 30 days
    const avgResult = await HistoricalReading.aggregate([
      {
        $match: {
          timestamp: { $gte: lastMonth }
        }
      },
      {
        $group: {
          _id: null,
          avgAQI: { $avg: '$aqi.us' },
          minAQI: { $min: '$aqi.us' },
          maxAQI: { $max: '$aqi.us' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalDataPoints: totalPoints,
        dataPointsThisMonth: thisMonth,
        citiesTracked: cities.length,
        dataSources: sources,
        avgAQI: avgResult[0] ? Math.round(avgResult[0].avgAQI) : 0,
        minAQI: avgResult[0] ? Math.round(avgResult[0].minAQI) : 0,
        maxAQI: avgResult[0] ? Math.round(avgResult[0].maxAQI) : 0
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/collection-timeline
// Get data points collected over time
router.get('/collection-timeline', async (req, res, next) => {
  try {
    const { days } = req.query;
    const daysBack = parseInt(days) || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const timeline = await HistoricalReading.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    res.json({
      success: true,
      data: { timeline }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/coverage
// Get coverage by city
router.get('/coverage', async (req, res, next) => {
  try {
    const coverage = await HistoricalReading.aggregate([
      {
        $group: {
          _id: {
            city: '$location.name',
            country: '$location.country'
          },
          dataPoints: { $sum: 1 },
          avgAQI: { $avg: '$aqi.us' },
          lastReading: { $max: '$timestamp' }
        }
      },
      {
        $sort: { dataPoints: -1 }
      },
      {
        $limit: 50
      }
    ]);

    res.json({
      success: true,
      data: { coverage }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/sources
// Get breakdown by data source
router.get('/sources', async (req, res, next) => {
  try {
    const sources = await HistoricalReading.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          avgAQI: { $avg: '$aqi.us' }
        }
      }
    ]);

    res.json({
      success: true,
      data: { sources }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/aqi-distribution
// Get distribution of AQI levels
router.get('/aqi-distribution', async (req, res, next) => {
  try {
    const distribution = await HistoricalReading.aggregate([
      {
        $bucket: {
          groupBy: '$aqi.us',
          boundaries: [0, 51, 101, 151, 201, 301, 500],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            category: {
              $switch: {
                branches: [
                  { case: { $lt: ['$aqi.us', 51] }, then: 'Good' },
                  { case: { $lt: ['$aqi.us', 101] }, then: 'Moderate' },
                  { case: { $lt: ['$aqi.us', 151] }, then: 'Unhealthy for Sensitive' },
                  { case: { $lt: ['$aqi.us', 201] }, then: 'Unhealthy' },
                  { case: { $lt: ['$aqi.us', 301] }, then: 'Very Unhealthy' }
                ],
                default: 'Hazardous'
              }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: { distribution }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/api-usage
// Track API usage metrics (for monetization)
router.get('/api-usage', async (req, res, next) => {
  try {
    const { days } = req.query;
    const daysBack = parseInt(days) || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // This would track actual API calls
    // For now, estimate from data points
    const totalRequests = await HistoricalReading.countDocuments({
      timestamp: { $gte: startDate }
    });

    // Calculate value metrics
    const metrics = {
      totalRequests: totalRequests,
      avgRequestsPerDay: Math.round(totalRequests / daysBack),
      estimatedValue: totalRequests * 0.01, // Example: $0.01 per data point
      dataPoints: totalRequests,
      period: `Last ${daysBack} days`
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/export
// Export data as CSV
router.get('/export', async (req, res, next) => {
  try {
    const { days, format } = req.query;
    const daysBack = parseInt(days) || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const data = await HistoricalReading.find({
      timestamp: { $gte: startDate }
    }).lean();

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(data);
      res.header('Content-Type', 'text/csv');
      res.attachment(`aqi-data-${Date.now()}.csv`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: data
      });
    }

  } catch (error) {
    next(error);
  }
});

// Helper: Convert data to CSV
function convertToCSV(data) {
  if (data.length === 0) return '';

  const headers = ['Timestamp', 'Location', 'Country', 'Source', 'US AQI', 'China AQI', 'Temperature', 'Humidity'];
  const rows = data.map(d => [
    new Date(d.timestamp).toISOString(),
    d.location.name,
    d.location.country,
    d.source,
    d.aqi.us,
    d.aqi.cn,
    d.weather.temperature || '',
    d.weather.humidity || ''
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}

module.exports = router;
