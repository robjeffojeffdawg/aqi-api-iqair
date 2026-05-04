// services/scheduler.js
// Automatically records AQI readings every 30 minutes
// Builds up history data without requiring user visits

const iqairService = require('./iqairService');
const HistoricalReading = require('../models/HistoricalReading');

// Locations to track automatically
const TRACKED_LOCATIONS = [
  { name: 'Muak Lek, Saraburi', lat: 14.6494, lon: 101.2011 },
];

async function recordLocation(location) {
  try {
    const stations = await iqairService.getNearbyStations(location.lat, location.lon, 50);
    if (!stations || stations.length === 0) {
      console.log(`[Scheduler] No stations found for ${location.name}`);
      return;
    }

    const top = stations[0];
    const reading = new HistoricalReading({
      location: {
        name: top.name || location.name,
        coordinates: { lat: location.lat, lon: location.lon },
        city:    top.city    || '',
        state:   top.state   || '',
        country: top.country || ''
      },
      source: 'IQAir',
      aqi: {
        us: top.aqi?.us ?? 0,
        cn: top.aqi?.cn ?? 0
      },
      pollutants: {
        pm25: top.pollutants?.pm25 ?? null,
        pm10: top.pollutants?.pm10 ?? null,
        o3:   top.pollutants?.o3   ?? null,
        no2:  top.pollutants?.no2  ?? null,
        so2:  top.pollutants?.so2  ?? null,
        co:   top.pollutants?.co   ?? null
      },
      weather: {
        temperature: top.weather?.temperature ?? null,
        humidity:    top.weather?.humidity    ?? null,
        pressure:    top.weather?.pressure    ?? null,
        wind:        top.weather?.wind        ?? null
      }
    });

    await reading.save();
    console.log(`[Scheduler] Recorded ${location.name}: AQI ${top.aqi?.us ?? 0}`);
  } catch (e) {
    console.error(`[Scheduler] Failed for ${location.name}:`, e.message);
  }
}

async function runSchedule() {
  console.log('[Scheduler] Running scheduled AQI recording...');
  for (const location of TRACKED_LOCATIONS) {
    await recordLocation(location);
    // Small delay between locations to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }
}

function startScheduler() {
  const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

  // Run immediately on startup (after a short delay to let DB connect)
  setTimeout(runSchedule, 15000);

  // Then run every 30 minutes
  setInterval(runSchedule, INTERVAL_MS);

  console.log('[Scheduler] Started — recording every 30 minutes for:', TRACKED_LOCATIONS.map(l => l.name).join(', '));
}

module.exports = { startScheduler };
