const express = require('express');
const router = express.Router();
const iqairService = require('../services/iqairService');

// GET /api/aqi/nearby
// Get nearest city based on coordinates (IQAir limitation: returns only nearest city)
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lon, radius } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const searchRadius = radius ? parseInt(radius) : 50;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates'
      });
    }

    const stations = await iqairService.getNearbyStations(latitude, longitude, searchRadius);

    res.json({
      success: true,
      data: {
        location: { lat: latitude, lon: longitude },
        radius: searchRadius,
        count: stations.length,
        stations: stations,
        note: 'IQAir API returns only the nearest city. For more locations, use /api/aqi/cities endpoint.'
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/aqi/city
// Get detailed data for a specific city
router.get('/city', async (req, res, next) => {
  try {
    const { city, state, country } = req.query;

    if (!city || !country) {
      return res.status(400).json({
        error: 'City and country are required'
      });
    }

    const details = await iqairService.getCityData(city, state, country);

    res.json({
      success: true,
      data: details
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/aqi/station/:id
// Legacy endpoint for compatibility (redirects to city lookup)
router.get('/station/:id', async (req, res, next) => {
  try {
    // Station ID format: "city-state-country" or parse from ID
    const parts = req.params.id.split('-');
    
    res.status(400).json({
      error: 'This endpoint is not supported with IQAir. Use /api/aqi/city?city=CityName&country=CountryName&state=StateName instead'
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/aqi/current
// Get AQI for current location (requires lat/lon in query params)
router.get('/current', async (req, res, next) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Latitude and longitude are required for current location lookup'
      });
    }

    const data = await iqairService.getNearestCity(parseFloat(lat), parseFloat(lon));

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/aqi/search
// Search cities (limited functionality - use browse endpoints instead)
router.get('/search', async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Search query is required'
      });
    }

    const results = await iqairService.searchCities(query);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/aqi/countries
// Get list of supported countries
router.get('/countries', async (req, res, next) => {
  try {
    const countries = await iqairService.getCountries();

    res.json({
      success: true,
      data: {
        count: countries.length,
        countries: countries
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/aqi/states
// Get list of states in a country
router.get('/states', async (req, res, next) => {
  try {
    const { country } = req.query;

    if (!country) {
      return res.status(400).json({
        error: 'Country is required'
      });
    }

    const states = await iqairService.getStates(country);

    res.json({
      success: true,
      data: {
        country: country,
        count: states.length,
        states: states
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/aqi/cities
// Get list of cities in a state/country
router.get('/cities', async (req, res, next) => {
  try {
    const { state, country } = req.query;

    if (!state || !country) {
      return res.status(400).json({
        error: 'Both state and country are required'
      });
    }

    const cities = await iqairService.getCities(state, country);

    res.json({
      success: true,
      data: {
        state: state,
        country: country,
        count: cities.length,
        cities: cities
      }
    });

  } catch (error) {
    next(error);
  }
});

// POST /api/aqi/batch
// Get multiple cities at once
router.post('/batch', async (req, res, next) => {
  try {
    const { cities } = req.body;

    if (!Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({
        error: 'cities array is required with format: [{ city, state, country }]'
      });
    }

    if (cities.length > 20) {
      return res.status(400).json({
        error: 'Maximum 20 cities per request'
      });
    }

    const promises = cities.map(({ city, state, country }) => 
      iqairService.getCityData(city, state, country)
        .catch(err => ({ error: err.message, city, state, country }))
    );

    const results = await Promise.all(promises);

    res.json({
      success: true,
      data: {
        count: results.length,
        cities: results
      }
    });

  } catch (error) {
    next(error);
  }
});

// DELETE /api/aqi/cache
// Clear the cache (admin only - add auth middleware in production)
router.delete('/cache', async (req, res, next) => {
  try {
    iqairService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/aqi/cache/stats
// Get cache statistics
router.get('/cache/stats', async (req, res, next) => {
  try {
    const stats = iqairService.getCacheStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
