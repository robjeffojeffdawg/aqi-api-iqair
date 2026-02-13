const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

class IQAirService {
  constructor() {
    this.apiKey = process.env.IQAIR_API_KEY || 'demo';
    this.baseURL = 'http://api.airvisual.com/v2';
  }

  // Calculate distance between coordinates (Haversine formula)
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

  // Get AQI category and health recommendation
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
        health: 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution',
        color: '#ffff00',
        textColor: '#000000'
      };
    }
    if (aqi <= 150) {
      return { 
        level: 'Unhealthy for Sensitive Groups', 
        health: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected',
        color: '#ff7e00',
        textColor: '#000000'
      };
    }
    if (aqi <= 200) {
      return { 
        level: 'Unhealthy', 
        health: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects',
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
      health: 'Health warning of emergency conditions: everyone is more likely to be affected',
      color: '#7e0023',
      textColor: '#ffffff'
    };
  }

  // Format IQAir response to standard format
  formatStationData(data, distance = 0) {
    const { city, state, country, location, current } = data;
    const { pollution, weather } = current;

    const category = this.getAQICategory(pollution.aqius);

    return {
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
        pm25: null, // IQAir doesn't provide individual pollutant values in basic plan
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

  // Get nearest city by coordinates
  async getNearestCity(lat, lon) {
    const cacheKey = `nearest_${lat}_${lon}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log('Cache hit for nearest city');
      return cached;
    }

    try {
      const url = `${this.baseURL}/nearest_city?lat=${lat}&lon=${lon}&key=${this.apiKey}`;
      const response = await axios.get(url);

      if (response.data.status !== 'success') {
        throw new Error(response.data.data?.message || 'Failed to fetch nearest city');
      }

      const result = this.formatStationData(response.data.data);
      cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Error fetching nearest city:', error.message);
      throw error;
    }
  }

  // Get specific city data
  async getCityData(city, state, country) {
    const cacheKey = `city_${city}_${state}_${country}`.toLowerCase();
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log(`Cache hit for city ${city}`);
      return cached;
    }

    try {
      let url = `${this.baseURL}/city?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&key=${this.apiKey}`;
      
      if (state) {
        url += `&state=${encodeURIComponent(state)}`;
      }

      const response = await axios.get(url);

      if (response.data.status !== 'success') {
        throw new Error(response.data.data?.message || 'Failed to fetch city data');
      }

      const result = this.formatStationData(response.data.data);
      cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error(`Error fetching city ${city}:`, error.message);
      throw error;
    }
  }

  // Get list of supported countries
  async getCountries() {
    const cacheKey = 'countries_list';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseURL}/countries?key=${this.apiKey}`;
      const response = await axios.get(url);

      if (response.data.status !== 'success') {
        throw new Error('Failed to fetch countries');
      }

      const countries = response.data.data.map(c => ({
        country: c.country
      }));

      cache.set(cacheKey, countries);
      return countries;

    } catch (error) {
      console.error('Error fetching countries:', error.message);
      throw error;
    }
  }

  // Get list of states in a country
  async getStates(country) {
    const cacheKey = `states_${country}`.toLowerCase();
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseURL}/states?country=${encodeURIComponent(country)}&key=${this.apiKey}`;
      const response = await axios.get(url);

      if (response.data.status !== 'success') {
        throw new Error('Failed to fetch states');
      }

      const states = response.data.data.map(s => ({
        state: s.state
      }));

      cache.set(cacheKey, states);
      return states;

    } catch (error) {
      console.error(`Error fetching states for ${country}:`, error.message);
      throw error;
    }
  }

  // Get list of cities in a state
  async getCities(state, country) {
    const cacheKey = `cities_${state}_${country}`.toLowerCase();
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseURL}/cities?state=${encodeURIComponent(state)}&country=${encodeURIComponent(country)}&key=${this.apiKey}`;
      const response = await axios.get(url);

      if (response.data.status !== 'success') {
        throw new Error('Failed to fetch cities');
      }

      const cities = response.data.data.map(c => ({
        city: c.city
      }));

      cache.set(cacheKey, cities);
      return cities;

    } catch (error) {
      console.error(`Error fetching cities for ${state}, ${country}:`, error.message);
      throw error;
    }
  }

  // Search for cities (custom implementation since IQAir doesn't have direct search)
  async searchCities(query) {
    const cacheKey = `search_${query.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // This is a simplified search - in production, you'd want to maintain
    // a database of cities or use a more sophisticated search
    try {
      // For now, return empty results with a message
      // You could enhance this by maintaining a database of cities
      const result = {
        query: query,
        message: 'Search by exact city name using /api/aqi/city endpoint',
        suggestion: 'Use /api/aqi/countries, /api/aqi/states, or /api/aqi/cities to browse available locations'
      };

      cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error(`Error searching for ${query}:`, error.message);
      throw error;
    }
  }

  // Get nearby cities (simulate by getting nearest city)
  async getNearbyStations(lat, lon, radius = 50) {
    // IQAir only provides nearest city, not multiple nearby stations
    // This returns the nearest city wrapped in an array for compatibility
    const nearest = await this.getNearestCity(lat, lon);
    
    // Calculate actual distance
    const distance = this.calculateDistance(
      lat, lon, 
      nearest.coordinates.lat, 
      nearest.coordinates.lon
    );

    nearest.distance = distance;

    // Only return if within radius
    if (distance <= radius) {
      return [nearest];
    }

    return [];
  }

  // Clear cache
  clearCache() {
    cache.flushAll();
    console.log('Cache cleared');
  }

  // Get cache stats
  getCacheStats() {
    return cache.getStats();
  }
}

module.exports = new IQAirService();
