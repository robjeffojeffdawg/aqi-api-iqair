// services/scheduler.js
// Records AQI readings in the background so the Insights page has history.
//
// How it works
//  - Every 30 minutes a "tick" checks the watchlist (services/watchlist.js).
//  - A place is due when its newest saved reading is older than its tier's interval.
//    The newest reading is read from MongoDB, so restarts, redeploys and Render
//    sleeping never cause duplicate API calls.
//  - Each tick records at most MAX_IQAIR_PER_TICK IQAir places and
//    MAX_OPENAQ_PER_TICK OpenAQ places, spaced out to respect rate limits.
//  - IQAir calls are also capped per day (DAILY_IQAIR_CAP) to protect the monthly quota.
//  - A place with no station nearby is not retried for 24 hours.

const iqairService = require('./iqairService');
const openAQService = require('./openAQService');
const HistoricalReading = require('../models/HistoricalReading');
const { WATCHLIST } = require('./watchlist');

const HOUR_MS = 60 * 60 * 1000;
const TICK_MS = 30 * 60 * 1000;
const EARLY_TOLERANCE_MS = 10 * 60 * 1000;   // a place counts as due slightly early, so tick timing never skips a slot
const IQAIR_DELAY_MS = 20 * 1000;            // ~3 calls/min, leaving room for live visitors under IQAir's 5/min limit
const OPENAQ_DELAY_MS = 2 * 1000;
const MAX_IQAIR_PER_TICK = 15;
const MAX_OPENAQ_PER_TICK = 40;
const DAILY_IQAIR_CAP = 220;
const MAX_CONSECUTIVE_ERRORS = 3;            // stop a tick's calls if the API keeps failing (e.g. rate limited)
const MISS_BACKOFF_MS = 24 * HOUR_MS;
const LOOKBACK_MS = Math.max(...WATCHLIST.map(i => i.everyHours)) * HOUR_MS + 2 * HOUR_MS;

const missUntil = new Map();   // watchKey -> time before which we don't retry a place with no usable station
let iqairUsage = { day: '', calls: 0 };
let running = false;
let warnedNoOpenAQ = false;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function num(v) {
  return v === undefined || v === null || Number.isNaN(Number(v)) ? null : Number(v);
}

function iqairCallsLeft() {
  const day = new Date(Date.now()).toISOString().slice(0, 10);
  if (iqairUsage.day !== day) iqairUsage = { day, calls: 0 };
  return DAILY_IQAIR_CAP - iqairUsage.calls;
}

function nearest(stations) {
  return stations.slice().sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))[0];
}

function buildReading(item, station) {
  const usAqi = num(station?.aqi?.us ?? (typeof station?.aqi === 'number' ? station.aqi : null));
  if (usAqi === null) return null;

  return new HistoricalReading({
    watchKey: item.key,
    location: {
      name: station.name || item.name,
      coordinates: { lat: item.lat, lon: item.lon },   // the watched point, so /api/history matches by distance from it
      city:    station.city    || '',
      state:   station.state   || '',
      country: station.country || ''
    },
    source: item.source,
    aqi: {
      us: usAqi,
      cn: num(station.aqi?.cn) ?? undefined
    },
    pollutants: {
      pm25: num(station.pollutants?.pm25),
      pm10: num(station.pollutants?.pm10),
      o3:   num(station.pollutants?.o3),
      no2:  num(station.pollutants?.no2),
      so2:  num(station.pollutants?.so2),
      co:   num(station.pollutants?.co)
    },
    weather: {
      temperature: num(station.weather?.temperature),
      humidity:    num(station.weather?.humidity),
      pressure:    num(station.weather?.pressure),
      wind:        num(station.weather?.wind)
    }
  });
}

// Returns { status: 'saved', aqi } | { status: 'none' } | { status: 'unusable' }. Throws on API/DB errors.
async function recordItem(item) {
  const stations = item.source === 'IQAir'
    ? await iqairService.getNearbyStations(item.lat, item.lon, 50)
    : await openAQService.getNearbySensors(item.lat, item.lon, 25);

  if (!stations || stations.length === 0) return { status: 'none' };

  const station = item.source === 'IQAir' ? stations[0] : nearest(stations);
  const reading = buildReading(item, station);
  if (!reading) return { status: 'unusable' };

  await reading.save();
  return { status: 'saved', aqi: reading.aqi.us };
}

async function processGroup(items, delayMs, source) {
  let consecutiveErrors = 0;
  let saved = 0;

  for (const item of items) {
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.warn(`[Scheduler] ${source}: ${MAX_CONSECUTIVE_ERRORS} errors in a row, pausing until the next tick`);
      break;
    }
    if (source === 'IQAir') {
      if (iqairCallsLeft() <= 0) {
        console.warn(`[Scheduler] IQAir daily cap (${DAILY_IQAIR_CAP}) reached, resuming tomorrow`);
        break;
      }
      iqairUsage.calls++;
    }

    try {
      const result = await recordItem(item);
      consecutiveErrors = 0;
      if (result.status === 'saved') {
        saved++;
        console.log(`[Scheduler] Recorded ${item.name} (${source}): AQI ${result.aqi}`);
      } else {
        missUntil.set(item.key, Date.now() + MISS_BACKOFF_MS);
        console.log(`[Scheduler] ${item.name}: ${result.status === 'none' ? 'no station nearby' : 'no usable AQI in response'} (${source}), retrying in 24h`);
      }
    } catch (e) {
      consecutiveErrors++;
      console.error(`[Scheduler] Failed for ${item.name} (${source}):`, e.message);
    }

    await sleep(delayMs);
  }
  return saved;
}

async function getLastRecorded() {
  const since = new Date(Date.now() - LOOKBACK_MS);
  const rows = await HistoricalReading.aggregate([
    { $match: { watchKey: { $in: WATCHLIST.map(i => i.key) }, timestamp: { $gte: since } } },
    { $group: { _id: '$watchKey', last: { $max: '$timestamp' } } }
  ]);
  return new Map(rows.map(r => [r._id, new Date(r.last).getTime()]));
}

function isDue(item, last, now) {
  const blockedUntil = missUntil.get(item.key);
  if (blockedUntil && blockedUntil > now) return false;
  if (last === undefined) return true;
  return now - last >= item.everyHours * HOUR_MS - EARLY_TOLERANCE_MS;
}

async function runSchedule() {
  if (running) {
    console.log('[Scheduler] Previous run still in progress, skipping this tick');
    return;
  }
  running = true;

  try {
    let lastRecorded;
    try {
      lastRecorded = await getLastRecorded();
    } catch (e) {
      console.error('[Scheduler] Could not read history (is MongoDB connected?):', e.message);
      return;
    }

    const now = Date.now();
    const due = WATCHLIST
      .filter(item => isDue(item, lastRecorded.get(item.key), now))
      .sort((a, b) =>
        (a.tier === 'core' ? 0 : 1) - (b.tier === 'core' ? 0 : 1) ||   // core places first
        (lastRecorded.get(a.key) ?? 0) - (lastRecorded.get(b.key) ?? 0) // then the most overdue
      );

    const iqairDue  = due.filter(i => i.source === 'IQAir').slice(0, MAX_IQAIR_PER_TICK);
    let   openaqDue = due.filter(i => i.source === 'OpenAQ').slice(0, MAX_OPENAQ_PER_TICK);

    if (openaqDue.length && !openAQService.isAvailable()) {
      if (!warnedNoOpenAQ) {
        console.warn('[Scheduler] OPENAQ_API_KEY is not set, skipping Europe/world places');
        warnedNoOpenAQ = true;
      }
      openaqDue = [];
    }

    console.log(`[Scheduler] Tick: ${iqairDue.length} IQAir + ${openaqDue.length} OpenAQ places due (${WATCHLIST.length} watched)`);

    const savedIqair  = await processGroup(iqairDue, IQAIR_DELAY_MS, 'IQAir');
    const savedOpenAQ = await processGroup(openaqDue, OPENAQ_DELAY_MS, 'OpenAQ');
    console.log(`[Scheduler] Tick done: saved ${savedIqair} IQAir + ${savedOpenAQ} OpenAQ readings`);
  } catch (e) {
    console.error('[Scheduler] Run failed:', e.message);
  } finally {
    running = false;
  }
}

function startScheduler() {
  // First tick shortly after startup, then every 30 minutes.
  setTimeout(runSchedule, 15000);
  setInterval(runSchedule, TICK_MS);

  const byTier = {};
  WATCHLIST.forEach(i => { byTier[i.tier] = (byTier[i.tier] || 0) + 1; });
  console.log('[Scheduler] Started, ticking every 30 minutes for', WATCHLIST.length, 'places:',
    Object.entries(byTier).map(([tier, n]) => `${tier} ${n}`).join(', '));
}

module.exports = { startScheduler, runSchedule };
