const express = require('express');
const router = express.Router();
const iqairService = require('../services/iqairService');
const purpleAirService = require('../services/purpleAirService');
const openAQService = require('../services/openAQService');

// GET /api/aqi/nearby
// Get nearest stations based on coordinates — IQAir + PurpleAir + OpenAQ
router.get('/nearby', async (req, res, next) => {
  try {
    const { lat, lon, radius, sources } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const latitude     = parseFloat(lat);
    const longitude    = parseFloat(lon);
    const searchRadius = radius ? parseInt(radius) : 50;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const sourcesArray = sources ? sources.split(',') : ['iqair', 'purpleair', 'openaq'];
    let allStations = [];

    // IQAir
    if (sourcesArray.includes('iqair')) {
      try {
        const iqairStations = await iqairService.getNearbyStations(latitude, longitude, searchRadius);
        allStations = allStations.concat(iqairStations.map(s => ({ ...s, source: 'IQAir' })));
      } catch (error) {
        console.error('IQAir fetch failed:', error.message);
      }
    }

    // PurpleAir
    if (sourcesArray.includes('purpleair') && purpleAirService.isAvailable()) {
      try {
        const purpleAirStations = await purpleAirService.getNearbySensors(latitude, longitude, searchRadius);
        allStations = allStations.concat(purpleAirStations);
      } catch (error) {
        console.error('PurpleAir fetch failed:', error.message);
      }
    }

    // OpenAQ — fallback when IQAir has fewer than 2 stations
    const iqairCount = allStations.filter(s => s.source === 'IQAir').length;
    if (sourcesArray.includes('openaq') && openAQService.isAvailable() && iqairCount < 2) {
      try {
        const openAQStations = await openAQService.getNearbySensors(
          latitude, longitude, Math.min(searchRadius, 25)
        );
        for (const oStation of openAQStations) {
          const alreadyCovered = allStations.some(s =>
            s.distance !== undefined && Math.abs(s.distance - oStation.distance) < 2
          );
          if (!alreadyCovered) allStations.push(oStation);
        }
      } catch (error) {
        console.error('OpenAQ fetch failed:', error.message);
      }
    }

    allStations.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

    res.json({
      success: true,
      data: {
        location: { lat: latitude, lon: longitude },
        radius: searchRadius,
        count: allStations.length,
        stations: allStations,
        sources: {
          iqair:     sourcesArray.includes('iqair'),
          purpleair: sourcesArray.includes('purpleair') && purpleAirService.isAvailable(),
          openaq:    sourcesArray.includes('openaq')    && openAQService.isAvailable(),
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/aqi/city
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

    if (state) {
      try {
        const details = await iqairService.getCityData(city, state, country);
        return res.json({ success: true, data: details, method: 'with-state' });
      } catch (stateError) {
        console.log('Failed with state:', stateError.message);
      }
    }

    try {
      const details = await iqairService.getCityData(city, city, country);
      return res.json({ success: true, data: details, method: 'city-as-state' });
    } catch (cityStateError) {
      console.log('Failed with city as state:', cityStateError.message);
    }

    try {
      const details = await iqairService.getCityData(city, null, country);
      return res.json({ success: true, data: details, method: 'no-state' });
    } catch (noStateError) {
      console.log('Failed without state:', noStateError.message);
    }

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
router.get('/countries', async (req, res, next) => {
  try {
    const countries = await iqairService.getCountries();
    res.json({ success: true, data: { count: countries.length, countries } });
  } catch (error) { next(error); }
});

// GET /api/aqi/states
router.get('/states', async (req, res, next) => {
  try {
    const { country } = req.query;
    if (!country) return res.status(400).json({ error: 'Country is required' });
    const states = await iqairService.getStates(country);
    res.json({ success: true, data: { country, count: states.length, states } });
  } catch (error) { next(error); }
});

// GET /api/aqi/cities
router.get('/cities', async (req, res, next) => {
  try {
    const { state, country } = req.query;
    if (!state || !country) return res.status(400).json({ error: 'Both state and country are required' });
    const cities = await iqairService.getCities(state, country);
    res.json({ success: true, data: { state, country, count: cities.length, cities } });
  } catch (error) { next(error); }
});

// GET /api/aqi/sources
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
        },
        {
          name: 'OpenAQ',
          available: openAQService.isAvailable(),
          description: 'DEFRA + global government monitoring networks via OpenAQ v3',
          features: ['UK/Europe coverage', 'DEFRA stations', 'Fallback for thin IQAir coverage']
        }
      ]
    }
  });
});

// DELETE /api/aqi/cache
router.delete('/cache', async (req, res, next) => {
  try {
    iqairService.clearCache();
    if (purpleAirService.isAvailable()) purpleAirService.clearCache();
    if (openAQService.isAvailable())    openAQService.clearCache();
    res.json({ success: true, message: 'All caches cleared successfully' });
  } catch (error) { next(error); }
});

// GET /api/aqi/cache/stats
router.get('/cache/stats', async (req, res, next) => {
  try {
    const stats = {
      iqair:     iqairService.getCacheStats(),
      purpleair: purpleAirService.isAvailable() ? purpleAirService.getCacheStats() : null,
      openaq:    openAQService.isAvailable()    ? openAQService.getMetrics()       : null,
    };
    res.json({ success: true, data: stats });
  } catch (error) { next(error); }
});

// ── CITY SEARCH INDEX ──────────────────────────────────────────
let cityIndex = null;
let cityIndexBuilding = false;

const TARGET_COUNTRIES = [
  'UK','USA','Thailand','Australia','India','Germany','France','Japan',
  'China','Singapore','Canada','Indonesia','Malaysia','Spain','Italy',
  'Netherlands','Ireland','Poland','Sweden','Norway','Denmark','Belgium',
  'Switzerland','Brazil','Mexico','South Africa','New Zealand','Portugal',
  'Greece','Turkey','United Arab Emirates','Saudi Arabia','South Korea',
  'Taiwan','Vietnam','Philippines','Pakistan','Bangladesh','Sri Lanka',
  'Nepal','Kenya','Nigeria','Ghana','Argentina','Chile','Colombia','Peru'
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const mongoose = require('mongoose');

// Simple schema to persist the index
const CityIndexSchema = new mongoose.Schema({
  _id: { type: String, default: 'singleton' },
  cities: [{ city: String, state: String, country: String, search: String }],
  builtAt: Date
});
const CityIndexModel = mongoose.models.CityIndex || mongoose.model('CityIndex', CityIndexSchema);

async function loadIndexFromDB() {
  try {
    const doc = await CityIndexModel.findById('singleton');
    if (doc && doc.cities.length > 500) {
      cityIndex = doc.cities;
      console.log(`City index loaded from DB: ${cityIndex.length} cities`);
      return true;
    }
  } catch (e) { console.log('Could not load city index from DB:', e.message); }
  return false;
}

async function saveIndexToDB(index) {
  try {
    await CityIndexModel.findByIdAndUpdate(
      'singleton',
      { cities: index, builtAt: new Date() },
      { upsert: true }
    );
    console.log(`City index saved to DB: ${index.length} cities`);
  } catch (e) { console.log('Could not save city index to DB:', e.message); }
}

async function buildCityIndex() {
  if (cityIndexBuilding) return;

  // Try loading from DB first
  const loaded = await loadIndexFromDB();
  if (loaded) return;

  cityIndexBuilding = true;
  console.log('Building city index from scratch...');
  const index = [];

  for (const country of TARGET_COUNTRIES) {
    try {
      const states = await iqairService.getStates(country);
      for (const { state } of states) {
        try {
          const cities = await iqairService.getCities(state, country);
          for (const { city } of cities) {
            index.push({ city, state, country, search: city.toLowerCase() });
          }
          await sleep(1000);
        } catch {}
      }
      console.log(`Indexed ${country}: ${index.length} cities so far`);
      await sleep(2000);
    } catch (e) { console.log(`Skipped ${country}: ${e.message}`); }
  }

  cityIndex = index;
  cityIndexBuilding = false;
  console.log(`City index complete: ${index.length} cities`);
  await saveIndexToDB(index);
}

router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    if (!q || q.length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters' });

    if (!cityIndex) {
      if (!cityIndexBuilding) buildCityIndex();
      return res.json({ success: true, data: { results: [], building: true, message: 'City index is warming up — try again in 60 seconds' } });
    }

    const results = cityIndex
      .filter(c => c.search.includes(q))
      .sort((a, b) => {
        const aExact = a.search === q, bExact = b.search === q;
        const aStarts = a.search.startsWith(q), bStarts = b.search.startsWith(q);
        if (aExact !== bExact) return aExact ? -1 : 1;
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.city.localeCompare(b.city);
      })
      .slice(0, 10);

    res.json({ success: true, data: { query: q, count: results.length, results } });
  } catch (error) { next(error); }
});

router.get('/search/debug', (req, res) => {
  res.json({
    indexBuilt: !!cityIndex,
    indexSize: cityIndex ? cityIndex.length : 0,
    building: cityIndexBuilding,
    sample: cityIndex ? cityIndex.slice(0, 5) : []
  });
});

// On startup: load from DB instantly, only rebuild if missing
setTimeout(buildCityIndex, 5000);

router.get('/search/debug', (req, res) => {
  res.json({
    indexBuilt: !!cityIndex,
    indexSize: cityIndex ? cityIndex.length : 0,
    building: cityIndexBuilding,
    sample: cityIndex ? cityIndex.slice(0, 5) : []
  });
});

module.exports = router;
