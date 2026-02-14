const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Middleware
app.use(express.json());

// Root route
// NOTE: This will be overridden by public/index.html if it exists
app.get("/api", (req, res) => {
  res.json({
    name: "AQI API",
    status: "running",
    environment: process.env.NODE_ENV || "production"
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// AQI endpoint
app.get("/api/aqi", async (req, res) => {
  const city = req.query.city;

  if (!city) {
    return res.status(400).json({
      error: "City parameter is required"
    });
  }

  res.json({
    city,
    message: "AQI endpoint is working 🚀"
  });
});

// 404 handler (LAST)
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: "Route not found",
      status: 404
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AQI API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
});