const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const aqiRoutes = require('./routes/aqi');
const userRoutes = require('./routes/users');
const favoritesRoutes = require('./routes/favorites');
const alertsRoutes = require('./routes/alerts');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

// Middleware
app.use(helmet());
app.use(cors());
// CORS Configuration
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://robjeffojeffdawg.github.io',
    'https://robjeffojeffdawg.github.io/aqi-api-iqair/'  
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('combined'));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Routes
app.use('/api/aqi', aqiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/alerts', alertsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    name: "AQI Monitor API",
    version: "1.0.0",
    status: "running",
    documentation: "/api-docs (coming soon)",
    endpoints: {
      health: "/health",
      nearbyAQI: "/api/aqi/nearby?lat=LAT&lon=LON",
      countries: "/api/aqi/countries",
      states: "/api/aqi/states?country=COUNTRY",
      cities: "/api/aqi/cities?state=STATE&country=COUNTRY"
    },
    note: "Use /api/aqi/nearby with coordinates for best results"
  });
});

// Health check
app.get('/health', (req, res) => {
  // ... existing code
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Start server
// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AQI API server running on port ${PORT}`);
  console.log(`📊 Health check: https://aqi-api-iqair-production.up.railway.app:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
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