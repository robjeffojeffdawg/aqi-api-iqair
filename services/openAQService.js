// services/openAQService.js
// OpenAQ v3 API integration - station coverage for Europe and the rest of the world.
// Fixed: removed unsupported order_by=distance (caused HTTP 422), maps /latest values
// via sensorsId, makes far fewer calls, throttles to stay under rate limits.

const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 }); // 10 min cache

const OPENAQ_BASE = 'https://api.openaq.org/v3';
const API_KEY     = process.env.OPENAQ_API_KEY || '';

const MAX_STATIONS     = 3;                 // stations returned per lookup
const MAX_CANDIDATES   = 4;                 // locations we will query /latest for
const MAX_AGE_MS       = 6 * 60 * 60 * 1000; // ignore readings older than 6 h
const MIN_GAP_MS       = 1100;              // free tier: 60 req/min, so ~1 per second

// ── PM2.5 → US AQI (EPA breakpoints) ──────────────────────────
function pm25ToAQI(pm25) {
    if (pm25 === null || pm25 === undefined || isNaN(pm25)) return null;
    const c = Math.round(pm25 * 10) / 10;
    const bps = [
        { cLow: 0.0,   cHigh: 12.0,  iLow: 0,   iHigh: 50  },
        { cLow: 12.1,  cHigh: 35.4,  iLow: 51,  iHigh: 100 },
        { cLow: 35.5,  cHigh: 55.4,  iLow: 101, iHigh: 150 },
        { cLow: 55.5,  cHigh: 150.4, iLow: 151, iHigh: 200 },
        { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
        { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
        { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
    ];
    for (const bp of bps) {
        if (c >= bp.cLow && c <= bp.cHigh) {
            return Math.round(((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow);
        }
    }
    return c > 500 ? 500 : 0;
}

function getCategory(aqi) {
    if (aqi <= 50)  return { level: 'Good',                          color: '#00e400', textColor: '#000' };
    if (aqi <= 100) return { level: 'Moderate',                      color: '#ffff00', textColor: '#000' };
    if (aqi <= 150) return { level: 'Unhealthy for Sensitive Groups', color: '#ff7e00', textColor: '#fff' };
    if (aqi <= 200) return { level: 'Unhealthy',                     color: '#ff0000', textColor: '#fff' };
    if (aqi <= 300) return { level: 'Very Unhealthy',                color: '#8f3f97', textColor: '#fff' };
    return                 { level: 'Hazardous',                     color: '#7e0023', textColor: '#fff' };
}

function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Throttled fetch (shared by every call in this process) ────
let nextSlot = 0;
async function throttle() {
    const now = Date.now();
    const wait = Math.max(0, nextSlot - now);
    nextSlot = Math.max(now, nextSlot) + MIN_GAP_MS;
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
}

async function openAQFetch(url) {
    await throttle();
    const headers = { 'Accept': 'application/json' };
    if (API_KEY) headers['X-API-Key'] = API_KEY;

    const res = await fetch(url, { headers });
    if (!res.ok) {
        let detail = '';
        try { detail = (await res.text()).slice(0, 300); } catch (_) {}
        throw new Error(`OpenAQ HTTP ${res.status} ${res.statusText} ${detail}`.trim());
    }
    return res.json();
}

// ── Helpers ───────────────────────────────────────────────────
function paramName(sensor) {
    const n = sensor?.parameter?.name || '';
    return String(n).toLowerCase().replace('.', '');   // "pm2.5" -> "pm25"
}

function lastSeenMs(loc) {
    const s = loc?.datetimeLast?.utc;
    const t = s ? Date.parse(s) : NaN;
    return isNaN(t) ? null : t;
}

// ── Get nearby stations ───────────────────────────────────────
async function getNearbySensors(lat, lon, radiusKm = 25) {
    lat = Number(lat); lon = Number(lon);
    const cacheKey = `openaq_nearby_${lat.toFixed(3)}_${lon.toFixed(3)}_${radiusKm}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const radiusM = Math.max(1, Math.min(Math.round(radiusKm * 1000), 25000)); // API max 25 km
    const url = `${OPENAQ_BASE}/locations?coordinates=${lat.toFixed(4)},${lon.toFixed(4)}&radius=${radiusM}&limit=100`;

    console.log(`📡 OpenAQ API call: nearby ${lat.toFixed(3)},${lon.toFixed(3)} r=${radiusKm}km`);
    const data = await openAQFetch(url);
    const locations = Array.isArray(data.results) ? data.results : [];

    // Keep locations with a PM2.5 or PM10 sensor and a recent reading, nearest first
    const now = Date.now();
    const candidates = locations
        .map(loc => {
            const c = loc.coordinates || {};
            const d = (c.latitude != null && c.longitude != null)
                ? distanceKm(lat, lon, c.latitude, c.longitude) : Infinity;
            return { loc, d };
        })
        .filter(({ loc }) => {
            const names = (loc.sensors || []).map(paramName);
            if (!names.includes('pm25') && !names.includes('pm10')) return false;
            const seen = lastSeenMs(loc);
            return seen === null || now - seen <= MAX_AGE_MS;
        })
        .sort((a, b) => a.d - b.d)
        .slice(0, MAX_CANDIDATES);

    const stations = [];

    for (const { loc, d } of candidates) {
        if (stations.length >= MAX_STATIONS) break;
        try {
            const latest = await openAQFetch(`${OPENAQ_BASE}/locations/${loc.id}/latest`);

            // sensorsId -> { name, unit }
            const sensorMap = {};
            for (const s of (loc.sensors || [])) {
                sensorMap[s.id] = { name: paramName(s), unit: s.parameter?.units || '' };
            }

            const vals = {};
            const units = {};
            for (const r of (latest.results || [])) {
                const s = sensorMap[r.sensorsId];
                if (!s || typeof r.value !== 'number' || r.value < 0) continue;
                const t = Date.parse(r.datetime?.utc || '');
                if (!isNaN(t) && now - t > MAX_AGE_MS) continue;   // stale
                vals[s.name] = r.value;
                units[s.name] = s.unit;
            }

            const pm25 = vals.pm25 ?? null;
            const pm10 = vals.pm10 ?? null;
            const o3   = vals.o3   ?? null;
            const no2  = vals.no2  ?? null;
            const so2  = vals.so2  ?? null;
            const co   = vals.co   ?? null;

            if (pm25 === null && pm10 === null) continue;

            const aqi = pm25 !== null ? pm25ToAQI(pm25) : pm25ToAQI(pm10 * 0.6);
            const cat = getCategory(aqi ?? 0);
            const sLat = loc.coordinates?.latitude  ?? lat;
            const sLon = loc.coordinates?.longitude ?? lon;
            const pObj = (v, k, fallbackUnit) =>
                v !== null ? { concentration: v, unit: units[k] || fallbackUnit } : null;

            stations.push({
                name:          loc.name || loc.locality || 'OpenAQ Station',
                city:          loc.locality || loc.name || '',
                state:         loc.country?.name || '',
                country:       loc.country?.name || '',
                distance:      d,
                source:        'OpenAQ',
                aqi:           { us: aqi ?? 0, cn: Math.round((aqi ?? 0) * 0.9) },
                mainPollutant: pm25 !== null ? 'p2' : 'p1',
                category:      cat,
                coordinates:   { lat: sLat, lon: sLon },
                pollutants: {
                    // flat numbers (used by the scheduler / history)
                    pm25, pm10, o3, no2, so2, co,
                    // object form (IQAir-style shape)
                    p2: pObj(pm25, 'pm25', 'µg/m³'),
                    p1: pObj(pm10, 'pm10', 'µg/m³'),
                    n2: pObj(no2, 'no2', 'ppb'),
                    s2: pObj(so2, 'so2', 'ppb'),
                },
                weather: {},
            });
        } catch (err) {
            console.warn(`⚠️  OpenAQ: failed to get latest for location ${loc.id}:`, err.message);
            if (/ 429 /.test(err.message)) break;   // rate-limited: stop making calls
        }
    }

    stations.sort((a, b) => a.distance - b.distance);
    cache.set(cacheKey, stations, stations.length ? 600 : 300);
    console.log(`✅ OpenAQ returned ${stations.length} stations`);
    return stations;
}

function isAvailable() { return !!API_KEY; }

function getMetrics() {
    return { available: isAvailable(), cacheKeys: cache.keys().length, apiKeySet: !!API_KEY };
}

function clearCache() {
    cache.flushAll();
    console.log('🗑️  OpenAQ cache cleared');
}

module.exports = { getNearbySensors, isAvailable, getMetrics, clearCache, pm25ToAQI };
