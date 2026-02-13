const express = require('express');
const router = express.Router();
const { Alert } = require('../models');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// GET /api/alerts
// Get all alerts for current user
router.get('/', async (req, res, next) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id })
      .populate('locationId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        count: alerts.length,
        alerts: alerts
      }
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/alerts
// Create a new alert
router.post('/', async (req, res, next) => {
  try {
    const { locationId, threshold, pollutant, notificationMethod } = req.body;

    if (!threshold) {
      return res.status(400).json({
        error: 'Threshold is required'
      });
    }

    if (threshold < 0) {
      return res.status(400).json({
        error: 'Threshold must be a positive number'
      });
    }

    const alert = new Alert({
      userId: req.user._id,
      locationId: locationId || null,
      threshold: parseInt(threshold),
      pollutant: pollutant || 'aqi',
      notificationMethod: notificationMethod || 'email'
    });

    await alert.save();

    res.status(201).json({
      success: true,
      data: alert
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/alerts/:id
// Get a specific alert
router.get('/:id', async (req, res, next) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('locationId');

    if (!alert) {
      return res.status(404).json({
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });

  } catch (error) {
    next(error);
  }
});

// PUT /api/alerts/:id
// Update an alert
router.put('/:id', async (req, res, next) => {
  try {
    const { threshold, pollutant, enabled, notificationMethod } = req.body;

    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        error: 'Alert not found'
      });
    }

    if (threshold !== undefined) alert.threshold = parseInt(threshold);
    if (pollutant) alert.pollutant = pollutant;
    if (enabled !== undefined) alert.enabled = enabled;
    if (notificationMethod) alert.notificationMethod = notificationMethod;

    await alert.save();

    res.json({
      success: true,
      data: alert
    });

  } catch (error) {
    next(error);
  }
});

// DELETE /api/alerts/:id
// Delete an alert
router.delete('/:id', async (req, res, next) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      message: 'Alert deleted'
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/alerts/:id/toggle
// Toggle alert enabled/disabled
router.post('/:id/toggle', async (req, res, next) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!alert) {
      return res.status(404).json({
        error: 'Alert not found'
      });
    }

    alert.enabled = !alert.enabled;
    await alert.save();

    res.json({
      success: true,
      data: alert
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
