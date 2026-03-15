const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const aqiRoutes = require('./routes/aqi');
const historyRoutes = require('./routes/history');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
});

// Security Headers
app.use(helmet());

// CORS Configuration
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

// Body Parser
app.use(express.json());

// Logging - Different formats for dev vs production
if (process.env.NODE_ENV === 'production') {
  // Production: Log to console in combined format
  app.use(morgan('combined'));
} else {
  // Development: Detailed logging
  app.use(morgan('dev'));
}

// Custom logging middleware for API performance
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests (> 2 seconds)
    if (duration > 2000) {
      console.warn(`⚠️  Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    // Log errors
    if (res.statusCode >= 400) {
      console.error(`❌ Error ${res.statusCode}: ${req.method} ${req.path}`);
    }
  });
  
  next();
});

// Rate Limiting - Protect against abuse
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health'
});

// Stricter rate limit for API endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    error: 'API rate limit exceeded. Please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use(generalLimiter);

// API Routes
app.use('/api/aqi', aqiRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/analytics', analyticsRoutes);

// Metrics endpoint (for monitoring)
app.get('/api/metrics', (req, res) => {
  try {
    const iqairService = require('./services/iqairService');
    
    let purpleairMetrics = null;
    try {
      const purpleAirService = require('./services/purpleAirService');
      if (purpleAirService.isAvailable && purpleAirService.isAvailable()) {
        purpleairMetrics = purpleAirService.getMetrics();
      }
    } catch (err) {
      console.log('PurpleAir service not available');
    }
    
    res.json({
      success: true,
      data: {
        iqair: iqairService.getMetrics(),
        purpleair: purpleairMetrics,
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version
        }
      }
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    name: "AQI Monitor API",
    version: "2.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      metrics: "/api/metrics",
      nearbyAQI: "/api/aqi/nearby?lat=LAT&lon=LON",
      countries: "/api/aqi/countries",
      states: "/api/aqi/states?country=COUNTRY",
      cities: "/api/aqi/cities?state=STATE&country=COUNTRY",
      sources: "/api/aqi/sources",
      history: "/api/history/location?lat=LAT&lon=LON&days=7",
      stats: "/api/history/stats?lat=LAT&lon=LON&days=30",
      analytics: "/api/analytics/overview"
    },
    dataSources: {
      iqair: "Professional monitoring stations",
      purpleair: "Community sensors"
    },
    rateLimit: {
      general: "100 requests per 15 minutes",
      api: "20 requests per minute"
    },
    note: "Use /api/aqi/nearby with coordinates for best results"
  });
});

// Health check - No rate limiting
app.get('/health', (req, res) => {
  const iqairService = require('./services/iqairService');
  const purpleAirService = require('./services/purpleAirService');
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    services: {
      iqair: iqairService.isAvailable(),
      purpleair: purpleAirService.isAvailable(),
      mongodb: require('mongoose').connection.readyState === 1
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error details
  console.error('❌ Error occurred:');
  console.error(`   Path: ${req.method} ${req.path}`);
  console.error(`   Error: ${err.message}`);
  console.error(`   Stack: ${err.stack}`);
  
  // Don't expose error details in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(err.status || 500).json({
    error: {
      message: isProduction ? 'An error occurred' : err.message,
      status: err.status || 500,
      ...(isProduction ? {} : { stack: err.stack })
    }
  });
});

// 404 handler - MUST BE LAST
app.use((req, res) => {
  console.warn(`⚠️  404 Not Found: ${req.method} ${req.path}`);
  
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
      path: req.path,
      suggestion: 'Check API documentation at /'
    }
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 ═══════════════════════════════════════════════════');
  console.log(`   AQI API Server v2.0.0`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Metrics: http://localhost:${PORT}/api/metrics`);
  console.log('═══════════════════════════════════════════════════\n');
  
  // Log service status
  const iqairService = require('./services/iqairService');
  const purpleAirService = require('./services/purpleAirService');
  
  console.log('📡 Services:');
  console.log(`   IQAir: ${iqairService.isAvailable() ? '✅ Active' : '❌ Disabled (no API key)'}`);
  console.log(`   PurpleAir: ${purpleAirService.isAvailable() ? '✅ Active' : '❌ Disabled (no API key)'}`);
  console.log(`   MongoDB: ${require('mongoose').connection.readyState === 1 ? '✅ Connected' : '⚠️  Connecting...'}`);
  console.log('\n');
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close MongoDB connection
    require('mongoose').connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;
