const express = require('express');
const router = express.Router();
const { FavoriteLocation } = require('../models');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// GET /api/favorites
// Get all favorite locations for current user
router.get('/', async (req, res, next) => {
  try {
    const favorites = await FavoriteLocation.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        count: favorites.length,
        favorites: favorites
      }
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/favorites
// Add a new favorite location
router.post('/', async (req, res, next) => {
  try {
    const { name, lat, lon, stationId } = req.body;

    if (!name || !lat || !lon) {
      return res.status(400).json({
        error: 'Name, latitude, and longitude are required'
      });
    }

    const favorite = new FavoriteLocation({
      userId: req.user._id,
      name,
      coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
      stationId
    });

    await favorite.save();

    res.status(201).json({
      success: true,
      data: favorite
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/favorites/:id
// Get a specific favorite location
router.get('/:id', async (req, res, next) => {
  try {
    const favorite = await FavoriteLocation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!favorite) {
      return res.status(404).json({
        error: 'Favorite location not found'
      });
    }

    res.json({
      success: true,
      data: favorite
    });

  } catch (error) {
    next(error);
  }
});

// PUT /api/favorites/:id
// Update a favorite location
router.put('/:id', async (req, res, next) => {
  try {
    const { name, lat, lon, stationId } = req.body;

    const favorite = await FavoriteLocation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!favorite) {
      return res.status(404).json({
        error: 'Favorite location not found'
      });
    }

    if (name) favorite.name = name;
    if (lat && lon) {
      favorite.coordinates = { lat: parseFloat(lat), lon: parseFloat(lon) };
    }
    if (stationId !== undefined) favorite.stationId = stationId;

    await favorite.save();

    res.json({
      success: true,
      data: favorite
    });

  } catch (error) {
    next(error);
  }
});

// DELETE /api/favorites/:id
// Delete a favorite location
router.delete('/:id', async (req, res, next) => {
  try {
    const favorite = await FavoriteLocation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!favorite) {
      return res.status(404).json({
        error: 'Favorite location not found'
      });
    }

    res.json({
      success: true,
      message: 'Favorite location deleted'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
