const express = require('express');
const router = express.Router();
const iqairService = require('../services/iqairService');

// =============================================================
// CITY LOOKUP TABLE
// Maps city slugs to { country, state, displayName, lat, lon }
// Add more cities here as needed
// =============================================================
const CITY_LOOKUP = {
  // ── THAILAND ──────────────────────────────────────────────
  'bangkok':        { country: 'Thailand', state: 'Bangkok',            displayName: 'Bangkok',         lat: 13.7563, lon: 100.5018 },
  'chiang-mai':     { country: 'Thailand', state: 'Chiang Mai',         displayName: 'Chiang Mai',      lat: 18.7883, lon: 98.9853  },
  'pattaya':        { country: 'Thailand', state: 'Chonburi',           displayName: 'Pattaya',         lat: 12.9236, lon: 100.8825 },
  'phuket':         { country: 'Thailand', state: 'Phuket',             displayName: 'Phuket',          lat: 7.8804,  lon: 98.3923  },
  'hat-yai':        { country: 'Thailand', state: 'Songkhla',           displayName: 'Hat Yai',         lat: 7.0086,  lon: 100.4747 },
  'nakhon-ratchasima': { country: 'Thailand', state: 'Nakhon Ratchasima', displayName: 'Nakhon Ratchasima', lat: 14.9799, lon: 102.0978 },
  'khon-kaen':      { country: 'Thailand', state: 'Khon Kaen',          displayName: 'Khon Kaen',       lat: 16.4419, lon: 102.8360 },
  'udon-thani':     { country: 'Thailand', state: 'Udon Thani',         displayName: 'Udon Thani',      lat: 17.4138, lon: 102.7872 },

  // ── INDIA ─────────────────────────────────────────────────
  'delhi':          { country: 'India',   state: 'Delhi',               displayName: 'Delhi',           lat: 28.7041, lon: 77.1025  },
  'mumbai':         { country: 'India',   state: 'Maharashtra',         displayName: 'Mumbai',          lat: 19.0760, lon: 72.8777  },
  'kolkata':        { country: 'India',   state: 'West Bengal',         displayName: 'Kolkata',         lat: 22.5726, lon: 88.3639  },
  'bengaluru':      { country: 'India',   state: 'Karnataka',           displayName: 'Bengaluru',       lat: 12.9716, lon: 77.5946  },
  'chennai':        { country: 'India',   state: 'Tamil Nadu',          displayName: 'Chennai',         lat: 13.0827, lon: 80.2707  },
  'hyderabad':      { country: 'India',   state: 'Telangana',           displayName: 'Hyderabad',       lat: 17.3850, lon: 78.4867  },
  'pune':           { country: 'India',   state: 'Maharashtra',         displayName: 'Pune',            lat: 18.5204, lon: 73.8567  },
  'ahmedabad':      { country: 'India',   state: 'Gujarat',             displayName: 'Ahmedabad',       lat: 23.0225, lon: 72.5714  },

  // ── CHINA ─────────────────────────────────────────────────
  'beijing':        { country: 'China',   state: 'Beijing',             displayName: 'Beijing',         lat: 39.9042, lon: 116.4074 },
  'shanghai':       { country: 'China',   state: 'Shanghai',            displayName: 'Shanghai',        lat: 31.2304, lon: 121.4737 },
  'guangzhou':      { country: 'China',   state: 'Guangdong',           displayName: 'Guangzhou',       lat: 23.1291, lon: 113.2644 },
  'shenzhen':       { country: 'China',   state: 'Guangdong',           displayName: 'Shenzhen',        lat: 22.5431, lon: 114.0579 },
  'chengdu':        { country: 'China',   state: 'Sichuan',             displayName: 'Chengdu',         lat: 30.5728, lon: 104.0668 },
  'wuhan':          { country: 'China',   state: 'Hubei',               displayName: 'Wuhan',           lat: 30.5928, lon: 114.3055 },

  // ── SOUTHEAST ASIA ────────────────────────────────────────
  'jakarta':        { country: 'Indonesia', state: 'Jakarta',           displayName: 'Jakarta',         lat: -6.2088, lon: 106.8456 },
  'surabaya':       { country: 'Indonesia', state: 'East Java',         displayName: 'Surabaya',        lat: -7.2575, lon: 112.7521 },
  'kuala-lumpur':   { country: 'Malaysia',  state: 'Kuala Lumpur',      displayName: 'Kuala Lumpur',    lat: 3.1390,  lon: 101.6869 },
  'singapore':      { country: 'Singapore', state: 'Singapore',         displayName: 'Singapore',       lat: 1.3521,  lon: 103.8198 },
  'manila':         { country: 'Philippines', state: 'Metro Manila',    displayName: 'Manila',          lat: 14.5995, lon: 120.9842 },
  'ho-chi-minh-city': { country: 'Vietnam', state: 'Ho Chi Minh City',  displayName: 'Ho Chi Minh City', lat: 10.8231, lon: 106.6297 },
  'hanoi':          { country: 'Vietnam',  state: 'Hanoi',              displayName: 'Hanoi',           lat: 21.0285, lon: 105.8542 },
  'yangon':         { country: 'Myanmar',  state: 'Yangon',             displayName: 'Yangon',          lat: 16.8661, lon: 96.1951  },
  'phnom-penh':     { country: 'Cambodia', state: 'Phnom Penh',         displayName: 'Phnom Penh',      lat: 11.5564, lon: 104.9282 },
  'vientiane':      { country: 'Laos',     state: 'Vientiane Prefecture', displayName: 'Vientiane',     lat: 17.9757, lon: 102.6331 },

  // ── USA ───────────────────────────────────────────────────
  'los-angeles':    { country: 'USA',  state: 'California',             displayName: 'Los Angeles',     lat: 34.0522, lon: -118.2437 },
  'new-york':       { country: 'USA',  state: 'New York',               displayName: 'New York',        lat: 40.7128, lon: -74.0060  },
  'chicago':        { country: 'USA',  state: 'Illinois',               displayName: 'Chicago',         lat: 41.8781, lon: -87.6298  },
  'houston':        { country: 'USA',  state: 'Texas',                  displayName: 'Houston',         lat: 29.7604, lon: -95.3698  },
  'phoenix':        { country: 'USA',  state: 'Arizona',                displayName: 'Phoenix',         lat: 33.4484, lon: -112.0740 },
  'san-francisco':  { country: 'USA',  state: 'California',             displayName: 'San Francisco',   lat: 37.7749, lon: -122.4194 },
  'seattle':        { country: 'USA',  state: 'Washington',             displayName: 'Seattle',         lat: 47.6062, lon: -122.3321 },
  'denver':         { country: 'USA',  state: 'Colorado',               displayName: 'Denver',          lat: 39.7392, lon: -104.9903 },

  // ── EUROPE ────────────────────────────────────────────────
  'london':         { country: 'UK',      state: 'England',             displayName: 'London',          lat: 51.5074, lon: -0.1278   },
  'paris':          { country: 'France',  state: 'Ile-de-France',       displayName: 'Paris',           lat: 48.8566, lon: 2.3522    },
  'berlin':         { country: 'Germany', state: 'Berlin',              displayName: 'Berlin',          lat: 52.5200, lon: 13.4050   },
  'madrid':         { country: 'Spain',   state: 'Community of Madrid', displayName: 'Madrid',          lat: 40.4168, lon: -3.7038   },
  'rome':           { country: 'Italy',   state: 'Lazio',               displayName: 'Rome',            lat: 41.9028, lon: 12.4964   },
  'amsterdam':      { country: 'Netherlands', state: 'North Holland',   displayName: 'Amsterdam',       lat: 52.3676, lon: 4.9041    },
  'warsaw':         { country: 'Poland',  state: 'Masovian',            displayName: 'Warsaw',          lat: 52.2297, lon: 21.0122   },
  'istanbul':       { country: 'Turkey',  state: 'Istanbul',            displayName: 'Istanbul',        lat: 41.0082, lon: 28.9784   },

  // ── MIDDLE EAST ───────────────────────────────────────────
  'dubai':          { country: 'UAE',          state: 'Dubai',          displayName: 'Dubai',           lat: 25.2048, lon: 55.2708   },
  'riyadh':         { country: 'Saudi Arabia', state: 'Riyadh',         displayName: 'Riyadh',          lat: 24.7136, lon: 46.6753   },
  'tehran':         { country: 'Iran',         state: 'Tehran',         displayName: 'Tehran',          lat: 35.6892, lon: 51.3890   },
  'karachi':        { country: 'Pakistan',     state: 'Sindh',          displayName: 'Karachi',         lat: 24.8607, lon: 67.0011   },
  'lahore':         { country: 'Pakistan',     state: 'Punjab',         displayName: 'Lahore',          lat: 31.5204, lon: 74.3587   },

  // ── AFRICA ────────────────────────────────────────────────
  'cairo':          { country: 'Egypt',        state: 'Cairo',          displayName: 'Cairo',           lat: 30.0444, lon: 31.2357   },
  'lagos':          { country: 'Nigeria',      state: 'Lagos',          displayName: 'Lagos',           lat: 6.5244,  lon: 3.3792    },
  'nairobi':        { country: 'Kenya',        state: 'Nairobi',        displayName: 'Nairobi',         lat: -1.2921, lon: 36.8219   },
  'johannesburg':   { country: 'South Africa', state: 'Gauteng',        displayName: 'Johannesburg',    lat: -26.2041, lon: 28.0473  },
  'accra':          { country: 'Ghana',        state: 'Greater Accra',  displayName: 'Accra',           lat: 5.6037,  lon: -0.1870   },

  // ── SOUTH AMERICA ─────────────────────────────────────────
  'sao-paulo':      { country: 'Brazil',    state: 'Sao Paulo',         displayName: 'São Paulo',       lat: -23.5505, lon: -46.6333 },
  'rio-de-janeiro': { country: 'Brazil',    state: 'Rio de Janeiro',    displayName: 'Rio de Janeiro',  lat: -22.9068, lon: -43.1729 },
  'buenos-aires':   { country: 'Argentina', state: 'Buenos Aires',      displayName: 'Buenos Aires',    lat: -34.6037, lon: -58.3816 },
  'bogota':         { country: 'Colombia',  state: 'Bogota',            displayName: 'Bogotá',          lat: 4.7110,   lon: -74.0721 },
  'lima':           { country: 'Peru',      state: 'Lima',              displayName: 'Lima',            lat: -12.0464, lon: -77.0428 },
  'santiago':       { country: 'Chile',     state: 'Santiago',          displayName: 'Santiago',        lat: -33.4489, lon: -70.6693 },

  // ── AUSTRALIA ─────────────────────────────────────────────
  'sydney':         { country: 'Australia', state: 'New South Wales',   displayName: 'Sydney',          lat: -33.8688, lon: 151.2093 },
  'melbourne':      { country: 'Australia', state: 'Victoria',          displayName: 'Melbourne',       lat: -37.8136, lon: 144.9631 },
  'brisbane':       { country: 'Australia', state: 'Queensland',        displayName: 'Brisbane',        lat: -27.4698, lon: 153.0251 },
  'perth':          { country: 'Australia', state: 'Western Australia',  displayName: 'Perth',          lat: -31.9505, lon: 115.8605 },

  // ── JAPAN / SOUTH KOREA ───────────────────────────────────
  'tokyo':          { country: 'Japan',      state: 'Tokyo',            displayName: 'Tokyo',           lat: 35.6762, lon: 139.6503  },
  'osaka':          { country: 'Japan',      state: 'Osaka',            displayName: 'Osaka',           lat: 34.6937, lon: 135.5023  },
  'seoul':          { country: 'South Korea', state: 'Seoul',           displayName: 'Seoul',           lat: 37.5665, lon: 126.9780  },
  'busan':          { country: 'South Korea', state: 'Busan',           displayName: 'Busan',           lat: 35.1796, lon: 129.0756  },
};

// ── AQI helper functions ──────────────────────────────────────

function getAQICategory(aqi) {
  if (aqi <= 50)  return { level: 'Good',                  color: '#00e400', textColor: '#000', emoji: '😊', advice: 'Air quality is satisfactory. Enjoy outdoor activities.' };
  if (aqi <= 100) return { level: 'Moderate',              color: '#ffff00', textColor: '#000', emoji: '😐', advice: 'Acceptable air quality. Unusually sensitive people should consider limiting prolonged outdoor exertion.' };
  if (aqi <= 150) return { level: 'Unhealthy for Sensitive Groups', color: '#ff7e00', textColor: '#fff', emoji: '😷', advice: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.' };
  if (aqi <= 200) return { level: 'Unhealthy',             color: '#ff0000', textColor: '#fff', emoji: '🤧', advice: 'Everyone may begin to experience health effects. Members of sensitive groups may experience more serious effects.' };
  if (aqi <= 300) return { level: 'Very Unhealthy',        color: '#8f3f97', textColor: '#fff', emoji: '😨', advice: 'Health alert: everyone may experience more serious health effects. Avoid prolonged outdoor exertion.' };
  return           { level: 'Hazardous',                   color: '#7e0023', textColor: '#fff', emoji: '☠️',  advice: 'Health warning of emergency conditions. Everyone is more likely to be affected. Stay indoors.' };
}

function getPollutantName(code) {
  const map = { p1: 'PM10', p2: 'PM2.5', o3: 'Ozone (O₃)', n2: 'Nitrogen Dioxide (NO₂)', s2: 'Sulfur Dioxide (SO₂)', co: 'Carbon Monoxide (CO)' };
  return map[code] || code;
}

function getWindDirection(deg) {
  if (deg === undefined || deg === null) return '';
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ── SEO City Page Route ───────────────────────────────────────
router.get('/test-city', (req, res) => res.send('<h1>City pages route is working!</h1>'));

router.get('/:city-aqi', async (req, res) => {
  try {
    const citySlug = req.params.city;
    console.log(`🌍 City page requested: ${citySlug}`);

    // Look up city metadata
    const cityMeta = CITY_LOOKUP[citySlug];

    // If city not in lookup, return 404 with helpful message
    if (!cityMeta) {
      return res.status(404).send(build404Page(citySlug));
    }

    const { country, state, displayName, lat, lon } = cityMeta;
    console.log(`🌍 Rendering page for: ${displayName}`);

    // ── Fetch live AQI data server-side ──────────────────────
    let aqiData = null;
    let fetchError = null;

    // Strategy 1: Try with state
    try {
      aqiData = await iqairService.getCityData(displayName, state, country);
    } catch (e1) {
      // Strategy 2: Try city as state
      try {
        aqiData = await iqairService.getCityData(displayName, displayName, country);
      } catch (e2) {
        // Strategy 3: Try nearest by coords
        try {
          const stations = await iqairService.getNearbyStations(lat, lon, 50);
          if (stations && stations.length > 0) {
            aqiData = stations[0];
          }
        } catch (e3) {
          fetchError = e3.message;
          console.error(`❌ All fetch strategies failed for ${displayName}:`, fetchError);
        }
      }
    }

    // ── Build structured data for Google ─────────────────────
    const aqi       = aqiData ? Math.round(aqiData.aqi?.us ?? aqiData.aqi ?? 0) : null;
    const category  = aqi !== null ? getAQICategory(aqi) : null;
    const pollutant = aqiData ? getPollutantName(aqiData.mainPollutant || aqiData.dominantPollutant || 'p2') : null;
    const temp      = aqiData?.weather?.temperature ?? null;
    const humidity  = aqiData?.weather?.humidity ?? null;
    const wind      = aqiData?.weather?.wind ?? null;
    const windDir   = getWindDirection(aqiData?.weather?.windDirection);
    const now       = new Date();
    const updatedAt = now.toISOString();
    const updatedReadable = now.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'long', timeStyle: 'short' }) + ' UTC';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- ── Primary SEO ── -->
    <title>${displayName} AQI Today${aqi !== null ? ` – ${aqi} (${category.level})` : ''} | Live Air Quality Index</title>
    <meta name="description" content="${aqi !== null
      ? `${displayName} air quality index is ${aqi} (${category.level}) right now. Main pollutant: ${pollutant}. ${category.advice}`
      : `Real-time air quality index for ${displayName}. Live AQI, PM2.5, pollution levels, and health recommendations updated hourly.`}">
    <meta name="keywords" content="${displayName} AQI, ${displayName} air quality, ${displayName} pollution, ${displayName} air quality index, ${country} AQI">
    <link rel="canonical" href="https://api.aqi.jeff-o-blogs.com/${citySlug}-aqi">

    <!-- ── Open Graph ── -->
    <meta property="og:title" content="${displayName} Air Quality: AQI ${aqi ?? '--'} (${category?.level ?? 'Loading'})">
    <meta property="og:description" content="${aqi !== null ? `${displayName} AQI is currently ${aqi} – ${category.level}. ${category.advice}` : `Live air quality data for ${displayName}.`}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://api.aqi.jeff-o-blogs.com/${citySlug}-aqi">

    <!-- ── Twitter Card ── -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${displayName} AQI: ${aqi ?? '--'} – ${category?.level ?? 'Live Data'}">
    <meta name="twitter:description" content="${aqi !== null ? category.advice : `Check live air quality for ${displayName}.`}">

    <!-- ── Structured Data (JSON-LD) ── -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${displayName} Air Quality Index",
      "description": "Real-time AQI data for ${displayName}, ${country}",
      "url": "https://api.aqi.jeff-o-blogs.com/${citySlug}-aqi",
      "dateModified": "${updatedAt}",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://aqi.jeff-o-blogs.com" },
          { "@type": "ListItem", "position": 2, "name": "${displayName} AQI", "item": "https://api.aqi.jeff-o-blogs.com/${citySlug}-aqi" }
        ]
      }
    }
    </script>

    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>🌍</text></svg>">

    <!-- ── Google Fonts ── -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">

    <style>
        :root {
            --bg:        #0b0f1a;
            --surface:   #111827;
            --surface2:  #1a2235;
            --border:    rgba(255,255,255,0.07);
            --text:      #e8eaf0;
            --muted:     #8892a4;
            --accent:    #4f8ef7;
            --aqi-color: ${category ? category.color : '#4f8ef7'};
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'DM Sans', sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            line-height: 1.6;
        }

        /* ── Noise texture overlay ── */
        body::before {
            content: '';
            position: fixed;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
            pointer-events: none;
            z-index: 0;
        }

        .wrap {
            position: relative;
            z-index: 1;
            max-width: 860px;
            margin: 0 auto;
            padding: 32px 20px 80px;
        }

        /* ── Navbar ── */
        nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 48px;
        }

        .nav-brand {
            font-family: 'DM Serif Display', serif;
            font-size: 20px;
            color: var(--text);
            text-decoration: none;
            letter-spacing: -0.3px;
        }

        .nav-brand span { color: var(--accent); }

        .nav-link {
            font-size: 13px;
            font-weight: 500;
            color: var(--muted);
            text-decoration: none;
            padding: 8px 16px;
            border: 1px solid var(--border);
            border-radius: 6px;
            transition: all 0.2s;
        }

        .nav-link:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }

        /* ── Hero ── */
        .hero {
            margin-bottom: 32px;
        }

        .breadcrumb {
            font-size: 12px;
            color: var(--muted);
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .breadcrumb a { color: var(--muted); text-decoration: none; }
        .breadcrumb a:hover { color: var(--text); }
        .breadcrumb-sep { opacity: 0.4; }

        .hero-title {
            font-family: 'DM Serif Display', serif;
            font-size: clamp(32px, 6vw, 56px);
            line-height: 1.1;
            letter-spacing: -1px;
            margin-bottom: 8px;
        }

        .hero-sub {
            font-size: 14px;
            color: var(--muted);
            font-weight: 300;
        }

        /* ── AQI Card ── */
        .aqi-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 48px 40px;
            margin-bottom: 24px;
            position: relative;
            overflow: hidden;
            animation: fadeUp 0.6s ease both;
        }

        .aqi-card::before {
            content: '';
            position: absolute;
            top: -80px;
            right: -80px;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, var(--aqi-color) 0%, transparent 70%);
            opacity: 0.08;
            pointer-events: none;
        }

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .aqi-main {
            display: flex;
            align-items: flex-end;
            gap: 20px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }

        .aqi-number {
            font-family: 'DM Serif Display', serif;
            font-size: clamp(80px, 16vw, 128px);
            line-height: 0.9;
            color: var(--aqi-color);
            letter-spacing: -4px;
            text-shadow: 0 0 60px color-mix(in srgb, var(--aqi-color) 30%, transparent);
            transition: color 0.5s ease;
        }

        .aqi-meta {
            padding-bottom: 8px;
        }

        .aqi-unit {
            font-size: 13px;
            font-weight: 500;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }

        .aqi-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 600;
            background: color-mix(in srgb, var(--aqi-color) 15%, transparent);
            color: var(--aqi-color);
            border: 1px solid color-mix(in srgb, var(--aqi-color) 30%, transparent);
        }

        .health-advice {
            font-size: 15px;
            color: var(--muted);
            line-height: 1.7;
            padding-top: 20px;
            border-top: 1px solid var(--border);
        }

        .health-advice strong { color: var(--text); }

        /* ── Stats Grid ── */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
            animation: fadeUp 0.6s 0.1s ease both;
        }

        .stat-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 20px;
            transition: border-color 0.2s;
        }

        .stat-card:hover { border-color: rgba(255,255,255,0.15); }

        .stat-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--muted);
            margin-bottom: 8px;
        }

        .stat-value {
            font-family: 'DM Serif Display', serif;
            font-size: 28px;
            color: var(--text);
            line-height: 1;
            margin-bottom: 4px;
        }

        .stat-unit {
            font-size: 12px;
            color: var(--muted);
        }

        /* ── AQI Scale ── */
        .scale-section {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 32px;
            margin-bottom: 24px;
            animation: fadeUp 0.6s 0.2s ease both;
        }

        .section-title {
            font-family: 'DM Serif Display', serif;
            font-size: 20px;
            margin-bottom: 20px;
            color: var(--text);
        }

        .scale-bar {
            height: 10px;
            border-radius: 999px;
            background: linear-gradient(to right, #00e400, #ffff00, #ff7e00, #ff0000, #8f3f97, #7e0023);
            margin-bottom: 8px;
            position: relative;
        }

        .scale-marker {
            position: absolute;
            top: -4px;
            transform: translateX(-50%);
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: white;
            border: 3px solid var(--aqi-color);
            box-shadow: 0 0 12px var(--aqi-color);
            transition: left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .scale-labels {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: var(--muted);
            margin-top: 8px;
        }

        .scale-levels {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-top: 20px;
        }

        .scale-level {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: var(--muted);
        }

        .scale-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        /* ── Info Section ── */
        .info-section {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 32px;
            margin-bottom: 24px;
            animation: fadeUp 0.6s 0.3s ease both;
        }

        .info-section p {
            color: var(--muted);
            font-size: 15px;
            line-height: 1.8;
            margin-bottom: 16px;
        }

        .info-section p:last-child { margin-bottom: 0; }

        .info-section strong { color: var(--text); }

        /* ── CTA ── */
        .cta-section {
            background: linear-gradient(135deg, var(--surface2), var(--surface));
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            animation: fadeUp 0.6s 0.4s ease both;
        }

        .cta-title {
            font-family: 'DM Serif Display', serif;
            font-size: 28px;
            margin-bottom: 12px;
        }

        .cta-sub {
            color: var(--muted);
            font-size: 15px;
            margin-bottom: 28px;
        }

        .cta-btn {
            display: inline-block;
            background: var(--accent);
            color: white;
            padding: 14px 36px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.2s;
            letter-spacing: 0.2px;
        }

        .cta-btn:hover {
            background: #3a7de8;
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(79,142,247,0.3);
        }

        /* ── Footer ── */
        footer {
            text-align: center;
            color: var(--muted);
            font-size: 13px;
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px solid var(--border);
        }

        footer a { color: var(--muted); text-decoration: none; }
        footer a:hover { color: var(--text); }

        .updated-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--muted);
            background: var(--surface2);
            padding: 4px 12px;
            border-radius: 999px;
            border: 1px solid var(--border);
            margin-bottom: 32px;
        }

        .pulse {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #22c55e;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        /* ── Error state ── */
        .error-notice {
            background: rgba(239,68,68,0.1);
            border: 1px solid rgba(239,68,68,0.2);
            border-radius: 12px;
            padding: 16px 20px;
            font-size: 14px;
            color: #fca5a5;
            margin-bottom: 24px;
        }

        @media (max-width: 600px) {
            .aqi-card { padding: 32px 24px; }
            .scale-levels { grid-template-columns: repeat(2,1fr); }
            .stats-grid { grid-template-columns: repeat(2,1fr); }
        }
    </style>
</head>
<body>
<div class="wrap">

    <!-- ── Navbar ── -->
    <nav>
        <a href="https://aqi.jeff-o-blogs.com" class="nav-brand">🌍 <span>AQI</span> Monitor</a>
        <a href="https://aqi.jeff-o-blogs.com" class="nav-link">← All Cities</a>
    </nav>

    <!-- ── Hero ── -->
    <div class="hero">
        <div class="breadcrumb">
            <a href="https://aqi.jeff-o-blogs.com">Home</a>
            <span class="breadcrumb-sep">›</span>
            <span>${displayName} AQI</span>
        </div>
        <h1 class="hero-title">${displayName}<br>Air Quality Index</h1>
        <p class="hero-sub">${country} · Live data updated hourly</p>
    </div>

    ${fetchError ? `<div class="error-notice">⚠️ Could not retrieve live data right now. Showing cached or estimated values. (${fetchError})</div>` : ''}

    ${aqi !== null ? `
    <!-- ── Updated tag ── -->
    <div class="updated-tag">
        <div class="pulse"></div>
        Live · Updated ${updatedReadable}
    </div>

    <!-- ── Main AQI Card ── -->
    <div class="aqi-card">
        <div class="aqi-main">
            <div class="aqi-number">${aqi}</div>
            <div class="aqi-meta">
                <div class="aqi-unit">US AQI</div>
                <div class="aqi-badge">${category.emoji} ${category.level}</div>
            </div>
        </div>
        <div class="health-advice">
            <strong>Health Advisory:</strong> ${category.advice}
            ${pollutant ? `<br><strong>Main Pollutant:</strong> ${pollutant}` : ''}
        </div>
    </div>

    <!-- ── Stats Grid ── -->
    <div class="stats-grid">
        ${temp !== null ? `
        <div class="stat-card">
            <div class="stat-label">🌡️ Temperature</div>
            <div class="stat-value">${temp}°</div>
            <div class="stat-unit">Celsius</div>
        </div>` : ''}
        ${humidity !== null ? `
        <div class="stat-card">
            <div class="stat-label">💧 Humidity</div>
            <div class="stat-value">${humidity}%</div>
            <div class="stat-unit">Relative humidity</div>
        </div>` : ''}
        ${wind !== null ? `
        <div class="stat-card">
            <div class="stat-label">💨 Wind</div>
            <div class="stat-value">${wind}</div>
            <div class="stat-unit">m/s ${windDir}</div>
        </div>` : ''}
        <div class="stat-card">
            <div class="stat-label">📊 CN AQI</div>
            <div class="stat-value">${aqiData?.aqi?.cn ?? '--'}</div>
            <div class="stat-unit">China standard</div>
        </div>
    </div>

    <!-- ── AQI Scale ── -->
    <div class="scale-section">
        <h2 class="section-title">Where does ${aqi} sit on the scale?</h2>
        <div class="scale-bar">
            <div class="scale-marker" style="left: ${Math.min(aqi / 3, 100)}%"></div>
        </div>
        <div class="scale-labels">
            <span>0</span><span>50</span><span>100</span><span>150</span><span>200</span><span>300+</span>
        </div>
        <div class="scale-levels">
            <div class="scale-level"><div class="scale-dot" style="background:#00e400"></div>0–50 Good</div>
            <div class="scale-level"><div class="scale-dot" style="background:#ffff00"></div>51–100 Moderate</div>
            <div class="scale-level"><div class="scale-dot" style="background:#ff7e00"></div>101–150 Sensitive</div>
            <div class="scale-level"><div class="scale-dot" style="background:#ff0000"></div>151–200 Unhealthy</div>
            <div class="scale-level"><div class="scale-dot" style="background:#8f3f97"></div>201–300 Very Unhealthy</div>
            <div class="scale-level"><div class="scale-dot" style="background:#7e0023"></div>301+ Hazardous</div>
        </div>
    </div>
    ` : `
    <!-- ── No data state ── -->
    <div class="aqi-card" style="text-align:center; padding: 60px 40px;">
        <div style="font-size: 48px; margin-bottom: 16px;">📡</div>
        <h2 style="font-family:'DM Serif Display',serif; font-size:24px; margin-bottom:12px;">Data Temporarily Unavailable</h2>
        <p style="color:var(--muted); font-size:15px;">We couldn't retrieve live air quality data for ${displayName} right now. Please try again shortly or use the main app to search by location.</p>
    </div>
    `}

    <!-- ── About AQI Section (SEO content) ── -->
    <div class="info-section">
        <h2 class="section-title">About Air Quality in ${displayName}</h2>
        <p>
            The <strong>Air Quality Index (AQI)</strong> is a standardised scale used to communicate how polluted the air is
            in ${displayName} and how it may affect your health. The US AQI scale runs from 0 to 500 —
            lower values indicate cleaner air, while higher values represent increasingly dangerous pollution levels.
        </p>
        <p>
            In ${displayName}, ${country}, air quality can be affected by vehicle emissions, industrial activity,
            weather patterns, and seasonal factors such as agricultural burning or dust storms.
            Monitoring AQI regularly helps residents and visitors make informed decisions about outdoor activities.
        </p>
        <p>
            <strong>Sensitive groups</strong> — including children, the elderly, and people with respiratory or heart
            conditions — should pay close attention to AQI readings and follow health advisories when levels rise
            above 100. At AQI levels above 150, even healthy individuals may begin to experience symptoms.
        </p>
    </div>

    <!-- ── CTA ── -->
    <div class="cta-section">
        <div class="cta-title">Monitor More Cities</div>
        <p class="cta-sub">Use your location or browse 100+ countries for live air quality data worldwide.</p>
        <a href="https://aqi.jeff-o-blogs.com" class="cta-btn">Open Live Jeffo Blogs' AQI Monitor →</a>
    </div>

    <!-- ── Footer ── -->
    <footer>
        <p>
            Data sourced from <strong>IQAir</strong> · 
            <a href="https://aqi.jeff-o-blogs.com">Jeffo Blogs' AQI Monitor</a> · 
            Page generated ${updatedReadable}
        </p>
    </footer>

</div>
</body>
</html>`;

    res.send(html);

  } catch (error) {
    console.error('❌ City page error:', error);
    res.status(500).send('Error loading city page. Please try again.');
  }
});

// ── 404 page for unknown cities ────────────────────────────────
function build404Page(citySlug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>City Not Found | Jeffo Blogs' AQI Monitor</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
    <style>
        body { font-family:'DM Sans',sans-serif; background:#0b0f1a; color:#e8eaf0; min-height:100vh; display:flex; align-items:center; justify-content:center; text-align:center; padding:20px; }
        h1 { font-family:'DM Serif Display',serif; font-size:48px; margin-bottom:16px; }
        p { color:#8892a4; font-size:16px; margin-bottom:32px; max-width:420px; }
        a { display:inline-block; background:#4f8ef7; color:white; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:600; }
    </style>
</head>
<body>
    <div>
        <div style="font-size:64px;margin-bottom:24px">🌫️</div>
        <h1>City Not Found</h1>
        <p>We don't have a dedicated page for "<strong>${citySlug}</strong>" yet. Use the main app to search any city worldwide.</p>
        <a href="https://aqi.jeff-o-blogs.com">Search All Cities →</a>
    </div>
</body>
</html>`;
}

module.exports = router;
