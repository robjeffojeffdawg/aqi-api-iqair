const express = require("express");
const app = express();

// Middleware
app.use(express.json());

// Root route (so the domain doesn't 404)
app.get("/", (req, res) => {
  res.json({
    name: "AQI API",
    status: "running",
    environment: process.env.NODE_ENV
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

// ✅ AQI endpoint (YOUR CODE — CORRECT)
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

// 404 handler (MUST be last)
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: "Route not found",
      status: 404
    }
  });
});

// Start server (ALWAYS last)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 AQI API server running on port ${PORT}`);
});
