const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

class PurpleAirService {
  constructor() {
    this.apiKey = process.env.PURPLEAIR_API_KEY;
    this.baseURL = 'https://api.purpleair.com/v1';
    
    if (!this.apiKey) {
      console.warn('⚠️ PurpleAir API key not configured');
    } else {
      console.log('✅ PurpleAir API configured');
    }
  }

  // Calculate distance between coordinates
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
             Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Convert PM2.5 to US AQI
  pm25ToAQI(pm25) {
    if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
    if (pm25 <= 35.4) return Math.round((50 / 23.4) * (pm25 - 12.0) + 50);
    if (pm25 <= 55.4) return Math.round((50 / 20.0) * (pm25 - 35.4) + 100);
    if (pm25 <= 150.4) return Math.round((100 / 95.0) * (pm25 - 55.4) + 150);
    if (pm25 <= 250.4) return Math.round((100 / 100.0) * (pm25 - 150.4) + 200);
    return Math.round((100 / 249.6) * (pm25 - 250.4) + 300);
  }

  // Get AQI category
  getAQICategory(aqi) {
    if (aqi <= 50) {
      return { 
        level: 'Good', 
        health: 'Air quality is satisfactory, and air pollution poses little or no risk',
        color: '#00e400',
        textColor: '#ffffff'
      };
    }
    if (aqi <= 100) {
      return { 
        level: 'Moderate', 
        health: 'Air quality is acceptable. However, there may be a risk for some people',
        color: '#ffff00',
        textColor: '#000000'
      };
    }
    if (aqi <= 150) {
      return { 
        level: 'Unhealthy for Sensitive Groups', 
        health: 'Members of sensitive groups may experience health effects',
        color: '#ff7e00',
        textColor: '#000000'
      };
    }
    if (aqi <= 200) {
      return { 
        level: 'Unhealthy', 
        health: 'Some members of the general public may experience health effects',
        color: '#ff0000',
        textColor: '#ffffff'
      };
    }
    if (aqi <= 300) {
      return { 
        level: 'Very Unhealthy', 
        health: 'Health alert: The risk of health effects is increased for everyone',
        color: '#8f3f97',
        textColor: '#ffffff'
      };
    }
    return { 
      level: 'Hazardous', 
      health: 'Health warning: everyone is more likely to be affected',
      color: '#7e0023',
      textColor: '#ffffff'
    };
  }

  // Get nearby sensors
  async getNearbySensors(lat, lon, radius = 50) {
    if (!this.apiKey) {
      throw new Error('PurpleAir API key not configured');
    }

    const cacheKey = `purpleair_nearby_${lat}_${lon}_${radius}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log('Cache hit for PurpleAir nearby sensors');
      return cached;
    }

    try {
      // Get sensors within bounding box
      const url = `${this.baseURL}/sensors`;
      const response = await axios.get(url, {
        headers: {
          'X-API-Key': this.apiKey
        },
        params: {
          fields: 'name,latitude,longitude,pm2.5,pm2.5_10minute,pm2.5_60minute,temperature,humidity,pressure',
          location_type: 0, // Outside sensors only
          max_age: 3600, // Last hour
          nwlng: lon + (radius / 111), // Rough bounding box
          nwlat: lat + (radius / 111),
          selng: lon - (radius / 111),
          selat: lat - (radius / 111)
        }
      });

      if (!response.data || !response.data.data) {
        return [];
      }

      const fields = response.data.fields;
      const sensors = response.data.data.map(sensorData => {
        // Map array data to field names
        const sensor = {};
        fields.forEach((field, index) => {
          sensor[field] = sensorData[index];
        });

        // Calculate distance and AQI
        const distance = this.calculateDistance(lat, lon, sensor.latitude, sensor.longitude);
        const pm25 = sensor['pm2.5_10minute'] || sensor['pm2.5'] || 0;
        const aqi = this.pm25ToAQI(pm25);
        const category = this.getAQICategory(aqi);

        return {
          source: 'PurpleAir',
          stationId: `purpleair-${sensor.name}`.replace(/\s+/g, '-').toLowerCase(),
          name: sensor.name || 'Unknown Sensor',
          coordinates: {
            lat: sensor.latitude,
            lon: sensor.longitude
          },
          distance: distance,
          aqi: {
            us: aqi,
            cn: Math.round(aqi * 0.5) // Rough conversion
          },
          mainPollutant: 'p2',
          category: category,
          pollutants: {
            pm25: pm25,
            pm10: null,
            o3: null,
            no2: null,
            so2: null,
            co: null
          },
          weather: {
            temperature: sensor.temperature || null,
            humidity: sensor.humidity || null,
            pressure: sensor.pressure || null,
            wind: null,
            windDirection: null
          },
          time: {
            timestamp: new Date().toISOString(),
            timezone: null
          }
        };
      });

      // Filter by radius and sort by distance
      const filtered = sensors
        .filter(s => s.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10); // Limit to 10 sensors

      cache.set(cacheKey, filtered);
      return filtered;

    } catch (error) {
      console.error('Error fetching PurpleAir data:', error.message);
      if (error.response) {
        console.error('API Response:', error.response.status, error.response.data);
      }
      throw new Error('Failed to fetch PurpleAir sensors');
    }
  }

  // Check if service is available
  isAvailable() {
    return !!this.apiKey;
  }

  // Clear cache
  clearCache() {
    cache.flushAll();
    console.log('PurpleAir cache cleared');
  }

  // Get cache stats
  getCacheStats() {
    return cache.getStats();
  }
}

module.exports = new PurpleAirService();
