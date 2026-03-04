// ADD THIS TO routes/history.js

// GET /api/history/events
// Detect pollution events (spikes, unusual patterns)
router.get('/events', async (req, res, next) => {
  try {
    const { lat, lon, days, threshold } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const daysBack = parseInt(days) || 30;
    const aqiThreshold = parseInt(threshold) || 100; // Default: Moderate+

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const latRange = 10 / 111;
    const lonRange = 10 / (111 * Math.cos(latitude * Math.PI / 180));

    // Get all readings in period
    const readings = await HistoricalReading.find({
      'location.coordinates.lat': { $gte: latitude - latRange, $lte: latitude + latRange },
      'location.coordinates.lon': { $gte: longitude - lonRange, $lte: longitude + lonRange },
      timestamp: { $gte: startDate }
    }).sort({ timestamp: 1 }).lean();

    if (readings.length === 0) {
      return res.json({
        success: true,
        data: { events: [], message: 'No data available for analysis' }
      });
    }

    // Calculate average AQI
    const avgAQI = readings.reduce((sum, r) => sum + r.aqi.us, 0) / readings.length;
    const stdDev = Math.sqrt(
      readings.reduce((sum, r) => sum + Math.pow(r.aqi.us - avgAQI, 2), 0) / readings.length
    );

    // Detect events
    const events = [];
    let currentEvent = null;

    readings.forEach((reading, index) => {
      const isSpike = reading.aqi.us > avgAQI + (2 * stdDev); // 2 standard deviations
      const isHigh = reading.aqi.us > aqiThreshold;
      
      if (isSpike || isHigh) {
        if (!currentEvent) {
          // Start new event
          currentEvent = {
            type: isSpike ? 'spike' : 'elevated',
            startTime: reading.timestamp,
            startAQI: reading.aqi.us,
            peakAQI: reading.aqi.us,
            peakTime: reading.timestamp,
            duration: 0,
            readings: [reading]
          };
        } else {
          // Continue event
          currentEvent.readings.push(reading);
          if (reading.aqi.us > currentEvent.peakAQI) {
            currentEvent.peakAQI = reading.aqi.us;
            currentEvent.peakTime = reading.timestamp;
          }
        }
      } else {
        if (currentEvent && currentEvent.readings.length >= 2) {
          // End event
          currentEvent.endTime = currentEvent.readings[currentEvent.readings.length - 1].timestamp;
          currentEvent.endAQI = currentEvent.readings[currentEvent.readings.length - 1].aqi.us;
          currentEvent.duration = (new Date(currentEvent.endTime) - new Date(currentEvent.startTime)) / (1000 * 60 * 60); // hours
          currentEvent.avgAQI = Math.round(
            currentEvent.readings.reduce((sum, r) => sum + r.aqi.us, 0) / currentEvent.readings.length
          );
          
          // Determine severity
          if (currentEvent.peakAQI > 200) {
            currentEvent.severity = 'severe';
          } else if (currentEvent.peakAQI > 150) {
            currentEvent.severity = 'high';
          } else {
            currentEvent.severity = 'moderate';
          }
          
          events.push(currentEvent);
        }
        currentEvent = null;
      }
    });

    // Close any ongoing event
    if (currentEvent && currentEvent.readings.length >= 2) {
      currentEvent.endTime = currentEvent.readings[currentEvent.readings.length - 1].timestamp;
      currentEvent.endAQI = currentEvent.readings[currentEvent.readings.length - 1].aqi.us;
      currentEvent.duration = (new Date(currentEvent.endTime) - new Date(currentEvent.startTime)) / (1000 * 60 * 60);
      currentEvent.avgAQI = Math.round(
        currentEvent.readings.reduce((sum, r) => sum + r.aqi.us, 0) / currentEvent.readings.length
      );
      currentEvent.severity = currentEvent.peakAQI > 200 ? 'severe' : currentEvent.peakAQI > 150 ? 'high' : 'moderate';
      events.push(currentEvent);
    }

    // Remove readings array from events (too large)
    const cleanedEvents = events.map(e => {
      const { readings, ...event } = e;
      return {
        ...event,
        readingCount: readings.length
      };
    });

    res.json({
      success: true,
      data: {
        location: { lat: latitude, lon: longitude },
        period: { days: daysBack, start: startDate, end: new Date() },
        baseline: {
          avgAQI: Math.round(avgAQI),
          stdDev: Math.round(stdDev),
          threshold: aqiThreshold
        },
        eventCount: cleanedEvents.length,
        events: cleanedEvents.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/history/alerts
// Get periods when AQI exceeded safe levels
router.get('/alerts', async (req, res, next) => {
  try {
    const { lat, lon, days } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const daysBack = parseInt(days) || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const latRange = 10 / 111;
    const lonRange = 10 / (111 * Math.cos(latitude * Math.PI / 180));

    // Get unhealthy periods (AQI > 100)
    const unhealthyReadings = await HistoricalReading.find({
      'location.coordinates.lat': { $gte: latitude - latRange, $lte: latitude + latRange },
      'location.coordinates.lon': { $gte: longitude - lonRange, $lte: longitude + lonRange },
      timestamp: { $gte: startDate },
      'aqi.us': { $gt: 100 }
    }).sort({ timestamp: -1 }).limit(50).lean();

    // Count by category
    const bySeverity = {
      unhealthyForSensitive: unhealthyReadings.filter(r => r.aqi.us > 100 && r.aqi.us <= 150).length,
      unhealthy: unhealthyReadings.filter(r => r.aqi.us > 150 && r.aqi.us <= 200).length,
      veryUnhealthy: unhealthyReadings.filter(r => r.aqi.us > 200 && r.aqi.us <= 300).length,
      hazardous: unhealthyReadings.filter(r => r.aqi.us > 300).length
    };

    // Calculate time spent in unhealthy conditions
    const totalReadings = await HistoricalReading.countDocuments({
      'location.coordinates.lat': { $gte: latitude - latRange, $lte: latitude + latRange },
      'location.coordinates.lon': { $gte: longitude - lonRange, $lte: longitude + lonRange },
      timestamp: { $gte: startDate }
    });

    const percentageUnhealthy = totalReadings > 0 
      ? Math.round((unhealthyReadings.length / totalReadings) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        location: { lat: latitude, lon: longitude },
        period: { days: daysBack },
        summary: {
          totalUnhealthyReadings: unhealthyReadings.length,
          totalReadings: totalReadings,
          percentageUnhealthy: percentageUnhealthy,
          bySeverity: bySeverity
        },
        recentUnhealthyPeriods: unhealthyReadings.slice(0, 10).map(r => ({
          timestamp: r.timestamp,
          aqi: r.aqi.us,
          location: r.location.name
        }))
      }
    });

  } catch (error) {
    next(error);
  }
});
