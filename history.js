const express = require('express');
const router = express.Router();
const historicalDataService = require('../services/historicalDataService');
const { authenticateToken } = require('../middleware/auth');

// GET /api/history/:stationId
// Get historical data for a station
router.get('/:stationId', async (req, res, next) => {
  try {
    const { stationId } = req.params;
    const { startDate, endDate } = req.query;

    const history = await historicalDataService.getHistory(stationId, startDate, endDate);

    res.json({
      success: true,
      data: {
        stationId,
        count: history.length,
        readings: history
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/history/:stationId/statistics
// Get statistics for a station
router.get('/:stationId/statistics', async (req, res, next) => {
  try {
    const { stationId } = req.params;
    const { days } = req.query;

    const stats = await historicalDataService.getStatistics(
      stationId, 
      days ? parseInt(days) : 7
    );

    if (!stats) {
      return res.status(404).json({
        error: 'No data available for this station'
      });
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/history/:stationId/hourly
// Get hourly averages
router.get('/:stationId/hourly', async (req, res, next) => {
  try {
    const { stationId } = req.params;
    const { hours } = req.query;

    const hourlyData = await historicalDataService.getHourlyAverages(
      stationId,
      hours ? parseInt(hours) : 24
    );

    res.json({
      success: true,
      data: {
        stationId,
        count: hourlyData.length,
        hourly: hourlyData
      }
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/history/start-collection
// Start collecting data for a location (requires auth)
router.post('/start-collection', authenticateToken, async (req, res, next) => {
  try {
    const { city, state, country, intervalMinutes } = req.body;

    if (!city || !country) {
      return res.status(400).json({
        error: 'City and country are required'
      });
    }

    await historicalDataService.startCollection(
      city,
      state,
      country,
      intervalMinutes || 60
    );

    res.json({
      success: true,
      message: `Started collecting data for ${city} every ${intervalMinutes || 60} minutes`
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/history/stop-collection
// Stop data collection (requires auth)
router.post('/stop-collection', authenticateToken, async (req, res, next) => {
  try {
    historicalDataService.stopCollection();

    res.json({
      success: true,
      message: 'Stopped data collection'
    });

  } catch (error) {
    next(error);
  }
});

// DELETE /api/history/clean
// Clean old data (requires auth)
router.delete('/clean', authenticateToken, async (req, res, next) => {
  try {
    const { daysToKeep } = req.query;

    const deletedCount = await historicalDataService.cleanOldData(
      daysToKeep ? parseInt(daysToKeep) : 30
    );

    res.json({
      success: true,
      message: `Cleaned ${deletedCount} old readings`
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
