// ADD THIS TO routes/history.js

// GET /api/history/seasonal
// Compare AQI across seasons
router.get('/seasonal', async (req, res, next) => {
  try {
    const { lat, lon, year } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const targetYear = parseInt(year) || new Date().getFullYear();

    const latRange = 10 / 111;
    const lonRange = 10 / (111 * Math.cos(latitude * Math.PI / 180));

    // Define seasons (Northern Hemisphere - adjust for Southern if needed)
    const seasons = {
      winter: [12, 1, 2],   // Dec, Jan, Feb
      spring: [3, 4, 5],     // Mar, Apr, May
      summer: [6, 7, 8],     // Jun, Jul, Aug
      autumn: [9, 10, 11]    // Sep, Oct, Nov
    };

    const seasonalData = await HistoricalReading.aggregate([
      {
        $match: {
          'location.coordinates.lat': { $gte: latitude - latRange, $lte: latitude + latRange },
          'location.coordinates.lon': { $gte: longitude - lonRange, $lte: longitude + lonRange },
          $expr: { $eq: [{ $year: '$timestamp' }, targetYear] }
        }
      },
      {
        $addFields: {
          month: { $month: '$timestamp' },
          season: {
            $switch: {
              branches: [
                { case: { $in: [{ $month: '$timestamp' }, [12, 1, 2]] }, then: 'winter' },
                { case: { $in: [{ $month: '$timestamp' }, [3, 4, 5]] }, then: 'spring' },
                { case: { $in: [{ $month: '$timestamp' }, [6, 7, 8]] }, then: 'summer' },
                { case: { $in: [{ $month: '$timestamp' }, [9, 10, 11]] }, then: 'autumn' }
              ],
              default: 'unknown'
            }
          }
        }
      },
      {
        $group: {
          _id: '$season',
          avgAQI: { $avg: '$aqi.us' },
          minAQI: { $min: '$aqi.us' },
          maxAQI: { $max: '$aqi.us' },
          count: { $sum: 1 },
          avgTemp: { $avg: '$weather.temperature' },
          avgHumidity: { $avg: '$weather.humidity' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Calculate year-over-year comparison if we have previous year data
    const previousYear = targetYear - 1;
    const previousYearData = await HistoricalReading.aggregate([
      {
        $match: {
          'location.coordinates.lat': { $gte: latitude - latRange, $lte: latitude + latRange },
          'location.coordinates.lon': { $gte: longitude - lonRange, $lte: longitude + lonRange },
          $expr: { $eq: [{ $year: '$timestamp' }, previousYear] }
        }
      },
      {
        $group: {
          _id: null,
          avgAQI: { $avg: '$aqi.us' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        location: { lat: latitude, lon: longitude },
        year: targetYear,
        seasons: seasonalData,
        yearOverYear: previousYearData.length > 0 ? {
          previousYear: previousYear,
          previousYearAvg: Math.round(previousYearData[0].avgAQI),
          currentYearAvg: Math.round(seasonalData.reduce((sum, s) => sum + s.avgAQI, 0) / seasonalData.length),
          change: 0 // Will be calculated
        } : null
      }
    });

  } catch (error) {
    next(error);
  }
});

// GET /api/history/monthly
// Get monthly trends
router.get('/monthly', async (req, res, next) => {
  try {
    const { lat, lon, year } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const targetYear = parseInt(year) || new Date().getFullYear();

    const latRange = 10 / 111;
    const lonRange = 10 / (111 * Math.cos(latitude * Math.PI / 180));

    const monthlyData = await HistoricalReading.aggregate([
      {
        $match: {
          'location.coordinates.lat': { $gte: latitude - latRange, $lte: latitude + latRange },
          'location.coordinates.lon': { $gte: longitude - lonRange, $lte: longitude + lonRange },
          $expr: { $eq: [{ $year: '$timestamp' }, targetYear] }
        }
      },
      {
        $group: {
          _id: { $month: '$timestamp' },
          avgAQI: { $avg: '$aqi.us' },
          minAQI: { $min: '$aqi.us' },
          maxAQI: { $max: '$aqi.us' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formattedData = monthlyData.map(m => ({
      month: monthNames[m._id - 1],
      monthNumber: m._id,
      avgAQI: Math.round(m.avgAQI),
      minAQI: Math.round(m.minAQI),
      maxAQI: Math.round(m.maxAQI),
      count: m.count
    }));

    res.json({
      success: true,
      data: {
        location: { lat: latitude, lon: longitude },
        year: targetYear,
        months: formattedData
      }
    });

  } catch (error) {
    next(error);
  }
});
