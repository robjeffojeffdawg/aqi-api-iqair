// services/openAQService.js
// OpenAQ v3 API integration — provides DEFRA + global station coverage
// Especially strong for UK, Europe, and areas with thin IQAir coverage

const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 }); // 10 min cache

const OPENAQ_BASE = 'https://api.openaq.org/v3';
const API_KEY     = process.env.OPENAQ_API_KEY || '';

// ── PM2.5 → US AQI conversion (EPA breakpoints) ──────────────
// OpenAQ returns raw µg/m³ — we convert to AQI so it matches IQAir format
function pm25ToAQI(pm25) {
    if (pm25 === null || pm25 === undefined || isNaN(pm25)) return null;
    const c = Math.round(pm25 * 10) / 10; // truncate to 1dp per EPA spec

    const breakpoints = [
        { cLow: 0.0,   cHigh: 12.0,  iLow: 0,   iHigh: 50  },
        { cLow: 12.1,  cHigh: 35.4,  iLow: 51,  iHigh: 100 },
        { cLow: 35.5,  cHigh: 55.4,  iLow: 101, iHigh: 150 },
        { cLow: 55.5,  cHigh: 150.4, iLow: 151, iHigh: 200 },
        { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
        { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
        { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
    ];

    for (const bp of breakpoints) {
        if (c >= bp.cLow && c <= bp.cHigh) {
            return Math.round(
                ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow
            );
        }
    }
    return c > 500 ? 500 : 0;
}

// ── AQI category ──────────────────────────────────────────────
function getCategory(aqi) {
    if (aqi <= 50)  return { level: 'Good',                          color: '#00e400', textColor: '#000' };
    if (aqi <= 100) return { level: 'Moderate',                      color: '#ffff00', textColor: '#000' };
    if (aqi <= 150) return { level: 'Unhealthy for Sensitive Groups', color: '#ff7e00', textColor: '#fff' };
    if (aqi <= 200) return { level: 'Unhealthy',                     color: '#ff0000', textColor: '#fff' };
    if (aqi <= 300) return { level: 'Very Unhealthy',                color: '#8f3f97', textColor: '#fff' };
    return                 { level: 'Hazardous',                     color: '#7e0023', textColor: '#fff' };
}

// ── Haversine distance (km) ───────────────────────────────────
function distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Fetch with API key header ─────────────────────────────────
async function openAQFetch(url) {
    const headers = { 'Accept': 'application/json' };
    if (API_KEY) headers['X-API-Key'] = API_KEY;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`OpenAQ HTTP ${res.status}: ${res.statusText}`);
    return res.json();
}

// ── Get nearby sensors ────────────────────────────────────────
// Returns stations in the same format as IQAir/PurpleAir so they
// slot directly into the existing /api/aqi/nearby response
async function getNearbySensors(lat, lon, radiusKm = 25) {
    const cacheKey = `openaq_nearby_${lat.toFixed(3)}_${lon.toFixed(3)}_${radiusKm}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log(`💾 Cache hit: OpenAQ nearby ${lat.toFixed(3)},${lon.toFixed(3)}`);
        return cached;
    }

    const radiusM = Math.min(radiusKm * 1000, 25000); // OpenAQ max is 25km
    const url = `${OPENAQ_BASE}/locations?coordinates=${lat},${lon}&radius=${radiusM}&limit=20&order_by=distance`;

    console.log(`📡 OpenAQ API call: nearby ${lat.toFixed(3)},${lon.toFixed(3)} r=${radiusKm}km`);
    const data = await openAQFetch(url);

    if (!data.results || data.results.length === 0) return [];

    // For each location, get its latest readings
    const stations = [];

    for (const loc of data.results.slice(0, 10)) {
        try {
            const latestUrl = `${OPENAQ_BASE}/locations/${loc.id}/latest`;
            const latest = await openAQFetch(latestUrl);

            if (!latest.results || latest.results.length === 0) continue;

            // Extract pollutant readings
            const readings = {};
            for (const r of latest.results) {
                if (r.parameter) readings[r.parameter] = r.value;
            }

            const pm25 = readings['pm25'] ?? readings['pm2.5'] ?? null;
            const pm10 = readings['pm10'] ?? null;
            const o3   = readings['o3']   ?? null;
            const no2  = readings['no2']  ?? null;
            const so2  = readings['so2']  ?? null;
            const co   = readings['co']   ?? null;

            if (pm25 === null && pm10 === null) continue; // no useful data

            const aqi = pm25ToAQI(pm25) ?? pm25ToAQI((pm10 ?? 0) * 0.6) ?? 0;
            const cat = getCategory(aqi);

            // Determine main pollutant
            let mainPollutant = 'p2';
            if (pm25 !== null) mainPollutant = 'p2';
            else if (pm10 !== null) mainPollutant = 'p1';

            const stationLat = loc.coordinates?.latitude  ?? lat;
            const stationLon = loc.coordinates?.longitude ?? lon;

            stations.push({
                name:          loc.name || loc.locality || 'OpenAQ Station',
                city:          loc.locality || loc.name || '',
                state:         loc.country?.name || '',
                country:       loc.country?.name || '',
                distance:      distanceKm(lat, lon, stationLat, stationLon),
                source:        'OpenAQ',
                aqi:           { us: aqi, cn: Math.round(aqi * 0.9) },
                mainPollutant,
                category:      cat,
                coordinates:   { lat: stationLat, lon: stationLon },
                pollutants: {
                    p2: pm25 !== null ? { concentration: pm25, unit: 'µg/m³' } : null,
                    p1: pm10 !== null ? { concentration: pm10, unit: 'µg/m³' } : null,
                    o3: o3  !== null ? { concentration: o3,  unit: 'ppb'    } : null,
                    n2: no2 !== null ? { concentration: no2, unit: 'ppb'    } : null,
                    s2: so2 !== null ? { concentration: so2, unit: 'ppb'    } : null,
                    co: co  !== null ? { concentration: co,  unit: 'ppm'    } : null,
                },
                weather: {}, // OpenAQ doesn't provide weather data
            });
        } catch (err) {
            console.warn(`⚠️  OpenAQ: failed to get latest for location ${loc.id}:`, err.message);
        }
    }

    // Sort by distance
    stations.sort((a, b) => a.distance - b.distance);

    cache.set(cacheKey, stations);
    console.log(`✅ OpenAQ returned ${stations.length} stations`);
    return stations;
}

// ── Service availability check ────────────────────────────────
function isAvailable() {
    return !!API_KEY;
}

function getMetrics() {
    return {
        available: isAvailable(),
        cacheKeys: cache.keys().length,
        apiKeySet: !!API_KEY,
    };
}

function clearCache() {
    cache.flushAll();
    console.log('🗑️  OpenAQ cache cleared');
}

module.exports = {
    getNearbySensors,
    isAvailable,
    getMetrics,
    clearCache,
    pm25ToAQI,
};
