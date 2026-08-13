// server.js - CLEAN - Uses existing services + history tracking
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

const iqairService = require('./services/iqairService');
const purpleAirService = require('./services/purpleAirService');
const openAQService = require('./services/openAQService');

const AccessRequest = require('./models/AccessRequest');
const ApiKey = require('./models/ApiKey');
const HistoricalReading = require('./models/HistoricalReading');

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.set('trust proxy', 1);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB error:', err);
});

// ═══════════════════════════════════════════════════════════
// HISTORY RECORDING (fire-and-forget, never blocks a response)
// ═══════════════════════════════════════════════════════════

async function recordHistory(station) {
  try {
    if (!station || !station.aqi || station.aqi.us === undefined || station.aqi.us === null) return;
    if (!station.coordinates || station.coordinates.lat === undefined) return;

    const reading = new HistoricalReading({
      location: {
        name: station.name || 'Unknown',
        coordinates: { lat: station.coordinates.lat, lon: station.coordinates.lon },
        city: station.city || '',
        state: station.state || '',
        country: station.country || ''
      },
      source: station.source || 'IQAir',
      aqi: { us: station.aqi.us ?? 0, cn: station.aqi.cn ?? 0 },
      pollutants: station.pollutants || {},
      weather: station.weather || {}
    });

    await reading.save();
  } catch (e) {
    console.error('[History] Failed to record:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════
// AQI API ENDPOINTS
// ═══════════════════════════════════════════════════════════

app.get('/api/aqi/city', async (req, res) => {
  try {
    const { city, country, state } = req.query;

    if (!city || !country) {
      return res.status(400).json({ error: 'Missing required parameters: city, country' });
    }

    console.log(`Fetching AQI for: ${city}, ${state || 'no state'}, ${country}`);

    if (state) {
      try {
        const data = await iqairService.getCityData(city, state, country);
        recordHistory(data);
        return res.json({ success: true, data });
      } catch (err) {
        console.log('Failed with state, trying without...');
      }
    }

    try {
      const data = await iqairService.getCityData(city, city, country);
      recordHistory(data);
      return res.json({ success: true, data });
    } catch (err) {
      console.log('Failed with city as state...');
    }

    try {
      const data = await iqairService.getCityData(city, null, country);
      recordHistory(data);
      return res.json({ success: true, data });
    } catch (err) {
      console.log('All attempts failed');
    }

    res.status(404).json({ success: false, error: 'City not found' });
  } catch (error) {
    console.error('Error in /api/aqi/city:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/aqi/nearby', async (req, res) => {
  try {
    const { lat, lon, radius = 50 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing required parameters: lat, lon' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const searchRadius = parseInt(radius);
    let allStations = [];

    try {
      const iqairStations = await iqairService.getNearbyStations(latitude, longitude, searchRadius);
      allStations = allStations.concat(iqairStations.map(s => ({ ...s, source: 'IQAir' })));
    } catch (error) {
      console.error('IQAir fetch failed:', error.message);
    }

    if (purpleAirService.isAvailable()) {
      try {
        const purpleairStations = await purpleAirService.getNearbySensors(latitude, longitude, searchRadius);
        allStations = allStations.concat(purpleairStations.map(s => ({ ...s, source: 'PurpleAir' })));
      } catch (error) {
        console.error('PurpleAir fetch failed:', error.message);
      }
    }

    if (openAQService.isAvailable() && allStations.length < 2) {
      try {
        const openaqStations = await openAQService.getNearbySensors(latitude, longitude, Math.min(searchRadius, 25));
        allStations = allStations.concat(openaqStations.map(s => ({ ...s, source: 'OpenAQ' })));
      } catch (error) {
        console.error('OpenAQ fetch failed:', error.message);
      }
    }

    if (allStations.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No stations found',
        data: { location: { lat: latitude, lon: longitude }, radius: searchRadius, count: 0, stations: [] }
      });
    }

    allStations.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

    recordHistory(allStations[0]);

    res.json({
      success: true,
      data: { location: { lat: latitude, lon: longitude }, radius: searchRadius, count: allStations.length, stations: allStations }
    });
  } catch (error) {
    console.error('Error in /api/aqi/nearby:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/aqi/countries', async (req, res) => {
  try {
    const countries = await iqairService.getCountries();
    res.json({ success: true, data: { count: countries.length, countries } });
  } catch (error) {
    console.error('Error in /api/aqi/countries:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/aqi/states', async (req, res) => {
  try {
    const { country } = req.query;
    if (!country) return res.status(400).json({ error: 'Missing required parameter: country' });
    const states = await iqairService.getStates(country);
    res.json({ success: true, data: { country, count: states.length, states } });
  } catch (error) {
    console.error('Error in /api/aqi/states:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/aqi/cities', async (req, res) => {
  try {
    const { state, country } = req.query;
    if (!state || !country) return res.status(400).json({ error: 'Missing required parameters: state, country' });
    const cities = await iqairService.getCities(state, country);
    res.json({ success: true, data: { state, country, count: cities.length, cities } });
  } catch (error) {
    console.error('Error in /api/aqi/cities:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// HISTORY ENDPOINT
// ═══════════════════════════════════════════════════════════

app.get('/api/history', async (req, res) => {
  try {
    const { lat, lon, hours = 24 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing required parameters: lat, lon' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const hoursBack = parseInt(hours) || 24;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hoursBack * 60 * 60 * 1000);

    const readings = await HistoricalReading.getReadingsInRange(latitude, longitude, startDate, endDate, 15);

    if (!readings.length) {
      return res.json({ success: true, data: { count: 0, stats: null, readings: [] } });
    }

    const aqiValues = readings.map(r => r.aqi.us);
    const stats = {
      min: Math.min(...aqiValues),
      max: Math.max(...aqiValues),
      avg: Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length)
    };

    res.json({
      success: true,
      data: {
        count: readings.length,
        stats,
        readings: readings.map(r => ({ timestamp: r.timestamp, aqi: r.aqi.us, source: r.source }))
      }
    });
  } catch (error) {
    console.error('Error in /api/history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// CONTACT / ACCESS REQUEST
// ═══════════════════════════════════════════════════════════

app.post('/contact/request-access', async (req, res) => {
  try {
    const { name, email, useCase } = req.body;

    if (!name || !email || !useCase) {
      return res.status(400).json({ error: 'Missing required fields: name, email, useCase' });
    }

    const existing = await AccessRequest.findOne({ email, status: 'pending' });
    if (existing) {
      return res.status(400).json({ error: 'You already have a pending request' });
    }

    const request = new AccessRequest({ name, email, useCase, status: 'pending' });
    await request.save();

    res.json({ success: true, message: 'Request submitted successfully', requestId: request._id });
  } catch (error) {
    console.error('Error in /contact/request-access:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════

app.get('/admin/requests', async (req, res) => {
  try {
    const requests = await AccessRequest.find().sort({ submittedAt: -1 });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Access Requests</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f1e; color: #e2e8f0; padding: 40px 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { margin-bottom: 30px; font-size: 28px; }
    table { width: 100%; border-collapse: collapse; background: #1a1a2e; border-radius: 8px; overflow: hidden; }
    th, td { padding: 16px; text-align: left; border-bottom: 1px solid #2a2a3e; }
    th { background: #16213e; font-weight: 600; }
    tr:hover { background: #2a2a3e; }
    .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .status.pending { background: #d97706; color: white; }
    .status.approved { background: #22c55e; color: white; }
    .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
    .btn-approve { background: #22c55e; color: white; }
    .btn-approve:hover { background: #16a34a; }
    .empty { text-align: center; padding: 40px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌍 API Access Requests</h1>
    ${requests.length === 0 ? '<div class="empty"><p>No requests yet</p></div>' : `
    <table>
      <thead>
        <tr><th>Name</th><th>Email</th><th>Use Case</th><th>Status</th><th>Submitted</th><th>Action</th></tr>
      </thead>
      <tbody>
        ${requests.map(req => `
        <tr>
          <td><strong>${req.name}</strong></td>
          <td>${req.email}</td>
          <td>${req.useCase.substring(0, 50)}...</td>
          <td><span class="status ${req.status}">${req.status}</span></td>
          <td>${new Date(req.submittedAt).toLocaleDateString()}</td>
          <td>${req.status === 'pending' ? `<button class="btn btn-approve" onclick="approve('${req._id}')">Approve</button>` : '<span>Approved</span>'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    `}
  </div>
  <script>
    function approve(id) {
      if (confirm('Approve this request and generate API key?')) {
        fetch(\`/admin/requests/\${id}/approve\`, { method: 'POST' })
          .then(r => r.json())
          .then(d => {
            if (d.success) {
              alert(\`✅ Approved!\\n\\nEmail: \${d.email}\\nAPI Key: \${d.apiKey}\\n\\nCopy this key and send to customer.\`);
              location.reload();
            } else {
              alert('Error: ' + d.error);
            }
          })
          .catch(e => alert('Error: ' + e.message));
      }
    }
  </script>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Error in /admin/requests:', error);
    res.status(500).send('Error loading requests');
  }
});

app.post('/admin/requests/:id/approve', async (req, res) => {
  try {
    const request = await AccessRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const apiKey = `aqi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const key = new ApiKey({ email: request.email, name: request.name, apiKey, status: 'active' });
    await key.save();

    request.status = 'approved';
    request.apiKey = apiKey;
    await request.save();

    res.json({ success: true, apiKey, email: request.email, message: 'Request approved' });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error', message: error.message });
});

// ═══════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  🌍 AQI Monitor API                        ║
║  ✅ CLEAN VERSION + HISTORY                ║
║  🚀 Server running on port ${PORT}             ║
║  📊 Admin: /admin/requests                 ║
╚════════════════════════════════════════════╝

📚 Endpoints:
   GET  /health
   GET  /api/aqi/city
   GET  /api/aqi/nearby
   GET  /api/aqi/countries
   GET  /api/aqi/states
   GET  /api/aqi/cities
   GET  /api/history
   POST /contact/request-access
   GET  /admin/requests
   POST /admin/requests/:id/approve
  `);
});

module.exports = app;