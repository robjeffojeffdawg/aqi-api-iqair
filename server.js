const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const aqiRoutes = require('./routes/aqi');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  // Don't exit - allow API to run without DB for testing
});

// Security & Middleware
app.use(helmet());

// CORS Configuration - Allow your domains
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://robjeffojeffdawg.github.io',
    'https://aqi.jeff-o-blogs.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(morgan('combined'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// API Routes
app.use('/api/aqi', aqiRoutes);
app.use('/api/history', historyRoutes);

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    name: "AQI Monitor API",
    version: "2.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      nearbyAQI: "/api/aqi/nearby?lat=LAT&lon=LON",
      countries: "/api/aqi/countries",
      states: "/api/aqi/states?country=COUNTRY",
      cities: "/api/aqi/cities?state=STATE&country=COUNTRY",
      sources: "/api/aqi/sources",
      history: "/api/history/location?lat=LAT&lon=LON&days=7",
      stats: "/api/history/stats?lat=LAT&lon=LON&days=30"
    },
    dataSources: {
      iqair: "Professional monitoring stations",
      purpleair: "Community sensors"
    },
    note: "Use /api/aqi/nearby with coordinates for best results"
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler - MUST BE LAST
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
      path: req.path
    }
  });
});

// Start server - Bind to 0.0.0.0 for Railway/cloud deployments
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AQI API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 CORS enabled for:`);
  console.log(`   - https://robjeffojeffdawg.github.io`);
  console.log(`   - https://aqi.jeff-o-blogs.com`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;
