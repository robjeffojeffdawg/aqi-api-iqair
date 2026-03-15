const axios = require('axios');
const NodeCache = require('node-cache');

class IQAirService {
  constructor() {
    // Validate API key on initialization
    this.apiKey = process.env.IQAIR_API_KEY;
    
    if (!this.apiKey) {
      console.error('⚠️  IQAIR_API_KEY not found in environment variables');
      console.error('⚠️  IQAir features will be disabled');
    } else if (this.apiKey.includes('demo') || this.apiKey.includes('test')) {
      console.error('⚠️  WARNING: Using demo/test API key! Replace with production key!');
    } else {
      console.log('✅ IQAir API key configured');
    }

    this.baseURL = 'http://api.airvisual.com/v2';
    
    // Enhanced caching: 10 minutes for general queries, 5 minutes for real-time data
    this.cache = new NodeCache({ 
      stdTTL: 600,  // 10 minutes default
      checkperiod: 120,  // Check for expired keys every 2 minutes
      useClones: false  // Better performance
    });

    // Logging metrics
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      totalResponseTime: 0
    };

    // Rate limiting: Track API calls
    this.rateLimitWindow = [];
    this.maxCallsPerMinute = 10;  // IQAir allows ~10 calls/min on free tier
  }

  // Check if service is available
  isAvailable() {
    return !!this.apiKey && !this.apiKey.includes('demo');
  }

  // Rate limiting check
  checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove calls older than 1 minute
    this.rateLimitWindow = this.rateLimitWindow.filter(time => time > oneMinuteAgo);
    
    if (this.rateLimitWindow.length >= this.maxCallsPerMinute) {
      const oldestCall = this.rateLimitWindow[0];
      const waitTime = Math.ceil((oldestCall + 60000 - now) / 1000);
      
      console.warn(`⚠️  Rate limit reached. Wait ${waitTime}s before next call.`);
      throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds.`);
    }
    
    this.rateLimitWindow.push(now);
  }

  // Make API request with error handling and logging
  async makeRequest(endpoint, params = {}) {
    const startTime = Date.now();
    
    try {
      // Check rate limit
      this.checkRateLimit();
      
      // Add API key to params
      params.key = this.apiKey;
      
      console.log(`📡 IQAir API call: ${endpoint}`);
      
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        params,
        timeout: 10000  // 10 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      this.metrics.apiCalls++;
      this.metrics.totalResponseTime += responseTime;
      
      console.log(`✅ IQAir response in ${responseTime}ms`);
      
      return response.data;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.metrics.errors++;
      
      console.error(`❌ IQAir API error (${responseTime}ms):`, error.message);
      
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Message: ${error.response.data?.data?.message || 'Unknown error'}`);
        
        // Handle specific error codes
        if (error.response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (error.response.status === 401) {
          throw new Error('Invalid API key. Check your IQAIR_API_KEY environment variable.');
        } else if (error.response.status === 404) {
          throw new Error('Location not found in IQAir database.');
        }
      }
      
      throw new Error(`IQAir API error: ${error.message}`);
    }
  }

  // Get nearest city with caching
  async getNearestCity(lat, lon) {
    const cacheKey = `nearest_${lat.toFixed(4)}_${lon.toFixed(4)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      console.log(`💾 Cache hit: ${cacheKey}`);
      return cached;
    }
    
    this.metrics.cacheMisses++;
    
    const data = await this.makeRequest('/nearest_city', { lat, lon });
    const formatted = this.formatStationData(data.data);
    
    // Cache for 5 minutes (real-time data)
    this.cache.set(cacheKey, formatted, 300);
    
    return formatted;
  }

  // Get city data with caching
  async getCityData(city, state, country) {
    const cacheKey = `city_${city}_${state}_${country}`.toLowerCase();
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      console.log(`💾 Cache hit: ${cacheKey}`);
      return cached;
    }
    
    this.metrics.cacheMisses++;
    
    const params = { city, country };
    if (state) params.state = state;
    
    const data = await this.makeRequest('/city', params);
    const formatted = this.formatStationData(data.data);
    
    // Cache for 10 minutes
    this.cache.set(cacheKey, formatted, 600);
    
    return formatted;
  }

  // Get countries with long cache (rarely changes)
  async getCountries() {
    const cacheKey = 'countries_list';
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }
    
    this.metrics.cacheMisses++;
    
    const data = await this.makeRequest('/countries');
    
    // Cache for 24 hours (countries list rarely changes)
    this.cache.set(cacheKey, data.data, 86400);
    
    return data.data;
  }

  // Get states with long cache
  async getStates(country) {
    const cacheKey = `states_${country}`.toLowerCase();
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }
    
    this.metrics.cacheMisses++;
    
    const data = await this.makeRequest('/states', { country });
    
    // Cache for 24 hours
    this.cache.set(cacheKey, data.data, 86400);
    
    return data.data;
  }

  // Get cities with long cache
  async getCities(state, country) {
    const cacheKey = `cities_${state}_${country}`.toLowerCase();
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }
    
    this.metrics.cacheMisses++;
    
    const data = await this.makeRequest('/cities', { state, country });
    
    // Cache for 24 hours
    this.cache.set(cacheKey, data.data, 86400);
    
    return data.data;
  }

  // Get nearby stations (simulated - IQAir only returns nearest)
  async getNearbyStations(lat, lon, radius = 50) {
    try {
      const nearest = await this.getNearestCity(lat, lon);
      
      // Calculate distance
      const distance = this.calculateDistance(
        lat, lon,
        nearest.coordinates.lat,
        nearest.coordinates.lon
      );
      
      nearest.distance = distance;
      
      // Return as array for consistency with PurpleAir
      return [nearest];
      
    } catch (error) {
      console.error('Failed to get nearby stations:', error.message);
      return [];
    }
  }

  // Search cities (not directly supported by IQAir, use cache)
  async searchCities(query, country = null) {
    // This would require getting all cities and filtering
    // Not recommended due to API limits
    throw new Error('City search not supported. Use /countries, /states, /cities endpoints instead.');
  }

  // Format station data
  formatStationData(data, distance = 0) {
    const { city, state, country, location, current } = data;
    const { pollution, weather } = current;

    const category = this.getAQICategory(pollution.aqius);

    return {
      source: 'IQAir',
      stationId: `${city}-${state}-${country}`.replace(/\s+/g, '-').toLowerCase(),
      name: `${city}${state ? `, ${state}` : ''}, ${country}`,
      city: city,
      state: state || null,
      country: country,
      coordinates: {
        lat: location.coordinates[1],
        lon: location.coordinates[0]
      },
      distance: distance,
      aqi: {
        us: pollution.aqius,
        cn: pollution.aqicn
      },
      mainPollutant: pollution.mainus,
      category: category,
      pollutants: {
        pm25: null,
        pm10: null,
        o3: null,
        no2: null,
        so2: null,
        co: null
      },
      weather: {
        temperature: weather.tp,
        humidity: weather.hu,
        pressure: weather.pr,
        wind: weather.ws,
        windDirection: weather.wd,
        icon: weather.ic
      },
      time: {
        timestamp: pollution.ts,
        timezone: location.timezone || null
      }
    };
  }

  // Get AQI category with color
  getAQICategory(aqi) {
    if (aqi <= 50) {
      return {
        level: 'Good',
        color: '#00e400',
        textColor: '#ffffff',
        health: 'Air quality is satisfactory, and air pollution poses little or no risk.'
      };
    } else if (aqi <= 100) {
      return {
        level: 'Moderate',
        color: '#ffff00',
        textColor: '#000000',
        health: 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.'
      };
    } else if (aqi <= 150) {
      return {
        level: 'Unhealthy for Sensitive Groups',
        color: '#ff7e00',
        textColor: '#000000',
        health: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.'
      };
    } else if (aqi <= 200) {
      return {
        level: 'Unhealthy',
        color: '#ff0000',
        textColor: '#ffffff',
        health: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.'
      };
    } else if (aqi <= 300) {
      return {
        level: 'Very Unhealthy',
        color: '#8f3f97',
        textColor: '#ffffff',
        health: 'Health alert: The risk of health effects is increased for everyone.'
      };
    } else {
      return {
        level: 'Hazardous',
        color: '#7e0023',
        textColor: '#ffffff',
        health: 'Health warning of emergency conditions: everyone is more likely to be affected.'
      };
    }
  }

  // Calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Get cache statistics
  getCacheStats() {
    const stats = this.cache.getStats();
    return {
      keys: stats.keys,
      hits: this.metrics.cacheHits,
      misses: this.metrics.cacheMisses,
      hitRate: this.metrics.cacheHits > 0 
        ? ((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(2) + '%'
        : '0%',
      ksize: stats.ksize,
      vsize: stats.vsize
    };
  }

  // Get performance metrics
  getMetrics() {
    return {
      apiCalls: this.metrics.apiCalls,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      errors: this.metrics.errors,
      averageResponseTime: this.metrics.apiCalls > 0 
        ? Math.round(this.metrics.totalResponseTime / this.metrics.apiCalls)
        : 0,
      cacheHitRate: this.metrics.cacheHits > 0
        ? ((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  // Clear cache
  clearCache() {
    this.cache.flushAll();
    console.log('🗑️  IQAir cache cleared');
  }
}

module.exports = new IQAirService();
