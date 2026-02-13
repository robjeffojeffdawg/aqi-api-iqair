const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

class AQIService {
  constructor() {
    this.apiToken = process.env.WAQI_API_TOKEN || 'demo';
    this.baseURL = 'https://api.waqi.info';
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

  // Get AQI category
  getAQICategory(aqi) {
    if (aqi <= 50) return { level: 'Good', health: 'Air quality is satisfactory' };
    if (aqi <= 100) return { level: 'Moderate', health: 'Acceptable for most people' };
    if (aqi <= 150) return { level: 'Unhealthy for Sensitive Groups', health: 'Sensitive groups should limit outdoor activities' };
    if (aqi <= 200) return { level: 'Unhealthy', health: 'Everyone may experience health effects' };
    if (aqi <= 300) return { level: 'Very Unhealthy', health: 'Health alert: everyone may experience serious effects' };
    return { level: 'Hazardous', health: 'Health warning: emergency conditions' };
  }

  // Search for nearby stations
  async searchNearbyStations(lat, lon, radius = 50) {
    const cacheKey = `nearby_${lat}_${lon}_${radius}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log('Cache hit for nearby stations');
      return cached;
    }

    try {
      const url = `${this.baseURL}/search/?token=${this.apiToken}&keyword=${lat},${lon}`;
      const response = await axios.get(url);

      if (response.data.status !== 'ok') {
        throw new Error('Failed to fetch AQI data');
      }

      const stations = response.data.data.map(station => ({
        ...station,
        distance: this.calculateDistance(lat, lon, station.station.geo[0], station.station.geo[1])
      }));

      // Filter by radius and sort by distance
      const filtered = stations
        .filter(s => s.distance <= radius)
        .sort((a, b) => a.distance - b.distance);

      cache.set(cacheKey, filtered);
      return filtered;

    } catch (error) {
      console.error('Error fetching nearby stations:', error.message);
      throw error;
    }
  }

  // Get detailed station data
  async getStationDetails(stationId) {
    const cacheKey = `station_${stationId}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log(`Cache hit for station ${stationId}`);
      return cached;
    }

    try {
      const url = `${this.baseURL}/feed/@${stationId}/?token=${this.apiToken}`;
      const response = await axios.get(url);

      if (response.data.status !== 'ok') {
        throw new Error('Failed to fetch station details');
      }

      const data = response.data.data;
      const category = this.getAQICategory(data.aqi);

      const result = {
        stationId: data.idx,
        name: data.city.name,
        coordinates: data.city.geo,
        aqi: data.aqi,
        category: category,
        pollutants: {
          pm25: data.iaqi?.pm25?.v || null,
          pm10: data.iaqi?.pm10?.v || null,
          o3: data.iaqi?.o3?.v || null,
          no2: data.iaqi?.no2?.v || null,
          so2: data.iaqi?.so2?.v || null,
          co: data.iaqi?.co?.v || null
        },
        weather: {
          temperature: data.iaqi?.t?.v || null,
          humidity: data.iaqi?.h?.v || null,
          pressure: data.iaqi?.p?.v || null,
          wind: data.iaqi?.w?.v || null
        },
        time: {
          timestamp: data.time.iso,
          timezone: data.time.tz
        },
        attributions: data.attributions
      };

      cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error(`Error fetching station ${stationId}:`, error.message);
      throw error;
    }
  }

  // Get current location AQI (IP-based or coordinates)
  async getCurrentLocationAQI(ip) {
    const cacheKey = `ip_${ip}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseURL}/feed/here/?token=${this.apiToken}`;
      const response = await axios.get(url);

      if (response.data.status !== 'ok') {
        throw new Error('Failed to fetch current location AQI');
      }

      const result = response.data.data;
      cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Error fetching current location AQI:', error.message);
      throw error;
    }
  }

  // Search stations by city name
  async searchByCity(cityName) {
    const cacheKey = `city_${cityName.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.baseURL}/search/?token=${this.apiToken}&keyword=${encodeURIComponent(cityName)}`;
      const response = await axios.get(url);

      if (response.data.status !== 'ok') {
        throw new Error('Failed to search by city');
      }

      cache.set(cacheKey, response.data.data);
      return response.data.data;

    } catch (error) {
      console.error(`Error searching for city ${cityName}:`, error.message);
      throw error;
    }
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

module.exports = new AQIService();
