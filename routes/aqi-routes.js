const express = require('express');
const router = express.Router();
const iqairService = require('../services/iqairService');
const purpleAirService = require('../services/purpleAirService');

// GET /api/aqi/nearby
// Get nearest city based on coordinates - now supports multiple sources
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lon, radius, sources } = req.query;

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

    // Determine which sources to use
    const sourcesArray = sources ? sources.split(',') : ['iqair', 'purpleair'];
    let allStations = [];

    // Get IQAir data
    if (sourcesArray.includes('iqair')) {
      try {
        const iqairStations = await iqairService.getNearbyStations(latitude, longitude, searchRadius);
        allStations = allStations.concat(iqairStations.map(s => ({ ...s, source: 'IQAir' })));
      } catch (error) {
        console.error('IQAir fetch failed:', error.message);
      }
    }

    // Get PurpleAir data
    if (sourcesArray.includes('purpleair') && purpleAirService.isAvailable()) {
      try {
        const purpleAirStations = await purpleAirService.getNearbySensors(latitude, longitude, searchRadius);
        allStations = allStations.concat(purpleAirStations);
      } catch (error) {
        console.error('PurpleAir fetch failed:', error.message);
      }
    }

    // Sort by distance
    allStations.sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      data: {
        location: { lat: latitude, lon: longitude },
        radius: searchRadius,
        count: allStations.length,
        stations: allStations,
        sources: {
          iqair: sourcesArray.includes('iqair'),
          purpleair: sourcesArray.includes('purpleair') && purpleAirService.isAvailable()
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/aqi/city
// Get detailed data for a specific city (IQAir only)
router.get('/city', async (req, res, next) => {
  try {
    const { city, state, country } = req.query;

    if (!city || !country) {
      return res.status(400).json({
        error: 'City and country are required',
        example: '/api/aqi/city?city=Bangkok&country=Thailand'
      });
    }

    console.log(`Attempting to fetch: ${city}, ${state || 'no state'}, ${country}`);

    // Strategy 1: Try with provided state (if given)
    if (state) {
      try {
        const details = await iqairService.getCityData(city, state, country);
        return res.json({
          success: true,
          data: details,
          method: 'with-state'
        });
      } catch (stateError) {
        console.log('Failed with state:', stateError.message);
      }
    }

    // Strategy 2: Try with city as both city and state
    try {
      console.log('Trying city as state...');
      const details = await iqairService.getCityData(city, city, country);
      return res.json({ 
        success: true, 
        data: details, 
        method: 'city-as-state'
      });
    } catch (cityStateError) {
      console.log('Failed with city as state:', cityStateError.message);
    }

    // Strategy 3: Try without state
    try {
      console.log('Trying without state...');
      const details = await iqairService.getCityData(city, null, country);
      return res.json({
        success: true,
        data: details,
        method: 'no-state'
      });
    } catch (noStateError) {
      console.log('Failed without state:', noStateError.message);
    }

    // All strategies failed
    return res.status(404).json({
      success: false,
      error: 'City not found',
      query: { city, state, country },
      suggestions: [
        'Try using /api/aqi/nearby with coordinates for best accuracy',
        'Browse /api/aqi/states and /api/aqi/cities to find exact names'
      ]
    });

  } catch (error) {
    console.error('City endpoint error:', error);
    next(error);
  }
});

// GET /api/aqi/countries
// Get list of supported countries (IQAir only)
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
// Get list of states in a country (IQAir only)
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
// Get list of cities in a state/country (IQAir only)
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

// GET /api/aqi/sources
// Get available data sources
router.get('/sources', (req, res) => {
  res.json({
    success: true,
    data: {
      sources: [
        {
          name: 'IQAir',
          available: true,
          description: 'Professional air quality monitoring stations worldwide',
          features: ['City lookup', 'Countries/States/Cities', 'Weather data']
        },
        {
          name: 'PurpleAir',
          available: purpleAirService.isAvailable(),
          description: 'Community-operated air quality sensors',
          features: ['Real-time PM2.5', 'High sensor density', 'Neighborhood-level data']
        }
      ]
    }
  });
});

// DELETE /api/aqi/cache
// Clear all caches
router.delete('/cache', async (req, res, next) => {
  try {
    iqairService.clearCache();
    if (purpleAirService.isAvailable()) {
      purpleAirService.clearCache();
    }
    
    res.json({
      success: true,
      message: 'All caches cleared successfully'
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/aqi/cache/stats
// Get cache statistics
router.get('/cache/stats', async (req, res, next) => {
  try {
    const stats = {
      iqair: iqairService.getCacheStats(),
      purpleair: purpleAirService.isAvailable() ? purpleAirService.getCacheStats() : null
    };
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
