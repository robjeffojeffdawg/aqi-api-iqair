const express = require('express');
const router = express.Router();

// Test route to verify it's working
router.get('/test-city', (req, res) => {
  res.send('<h1>City pages route is working!</h1>');
});

// SEO-optimized city page
// Matches URLs like: /bangkok-aqi, /london-aqi, etc.
router.get('/:city-aqi', async (req, res) => {
  try {
    console.log('🌍 City page requested:', req.params.city);
    
    // Extract city name from URL
    const citySlug = req.params.city;
    const cityName = citySlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    console.log('🌍 Rendering page for:', cityName);
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${cityName} AQI - Real-Time Air Quality | Jeff's AQI Monitor</title>
    <meta name="description" content="Live air quality index for ${cityName}. Real-time PM2.5, pollution levels, and health recommendations.">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>🌍</text></svg>">
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container { max-width: 800px; margin: 0 auto; }

        .header {
            background: white;
            border-radius: 16px;
            padding: 40px;
            margin-bottom: 24px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            text-align: center;
        }

        h1 {
            color: #2d3748;
            font-size: 36px;
            margin-bottom: 8px;
        }

        .subtitle {
            color: #718096;
            font-size: 16px;
            margin-bottom: 24px;
        }

        .aqi-display {
            background: white;
            border-radius: 16px;
            padding: 40px;
            margin-bottom: 24px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            text-align: center;
        }

        .aqi-value {
            font-size: 80px;
            font-weight: 800;
            line-height: 1;
            margin-bottom: 16px;
        }

        .aqi-label {
            font-size: 18px;
            color: #718096;
            margin-bottom: 16px;
        }

        .aqi-category {
            display: inline-block;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 24px;
        }

        .health-info {
            background: #f7fafc;
            padding: 20px;
            border-radius: 12px;
            text-align: left;
            color: #2d3748;
            line-height: 1.8;
        }

        .loading {
            text-align: center;
            padding: 60px;
            color: white;
            font-size: 18px;
        }

        .cta {
            background: white;
            border-radius: 16px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }

        .cta a {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.2s;
        }

        .cta a:hover {
            background: #5568d3;
            transform: translateY(-2px);
        }

        .footer {
            text-align: center;
            color: white;
            margin-top: 40px;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌍 ${cityName} Air Quality Index</h1>
            <p class="subtitle">Real-time air quality monitoring • Updated hourly</p>
        </div>

        <div id="content" class="loading">
            Loading ${cityName} air quality data...
        </div>

        <div class="cta">
            <h2 style="color: #2d3748; margin-bottom: 16px;">Check Other Cities</h2>
            <a href="https://aqi.jeff-o-blogs.com">View All Locations</a>
        </div>

        <div class="footer">
            <p>Jeff's AQI Monitor • Real-time air quality data worldwide</p>
        </div>
    </div>

    <script>
        const API_URL = 'https://aqi-api-iqair-production.up.railway.app';
        const cityName = '${cityName}';

        async function loadCityData() {
            try {
                // This is a placeholder - you'll need to add country lookup
                document.getElementById('content').innerHTML = \`
                    <div class="aqi-display">
                        <div class="aqi-value" style="color: #ffff00;">--</div>
                        <div class="aqi-label">US AQI</div>
                        <div class="health-info">
                            <strong>Note:</strong> To get live data for \${cityName}, please use the main app and search for your city.
                        </div>
                    </div>
                \`;
            } catch (error) {
                console.error('Error:', error);
            }
        }

        loadCityData();
    </script>
</body>
</html>`;

    res.send(html);

  } catch (error) {
    console.error('❌ City page error:', error);
    res.status(500).send('Error loading city page');
  }
});

module.exports = router;
