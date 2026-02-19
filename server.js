const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/database');
const aqiRoutes = require('./routes/aqi');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/aqi', aqiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (req, res) => {
  res.json({ 
    name: "AQI API", 
    status: "running",
    health: "/health",
    nearby: "/api/aqi/nearby?lat=LAT&lon=LON"
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
});

module.exports = app;
