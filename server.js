const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const connectDB = require('./config/database');
const aqiRoutes = require('./routes/aqi');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect MongoDB
connectDB();

// ===== CORS - ONLY ONCE, FIXED URLS (no trailing spaces) =====
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://robjeffojeffdawg.github.io',
    'https://aqi.jeff-o-blogs.com'  // ← removed trailing space
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ===== MIDDLEWARE =====
app.use(express.json());

// ===== API ROUTES =====
app.use('/api/aqi', aqiRoutes);
app.use('/api/history', historyRoutes);

// ===== STATIC FILES & FRONTEND =====
app.use(express.static(path.join(__dirname, 'public')));

// Serve history.html as the default page (moved BEFORE other routes)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

// ===== HEALTH CHECK (different path) =====
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ===== START =====
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;