## 📖 API Documentation

See [API-DOCUMENTATION.md](./API-DOCUMENTATION.md) for complete API reference.

### Quick Start

**Primary method (recommended):**
```
GET /api/aqi/nearby?lat=13.7563&lon=100.5018
```

Use coordinates for best results! The `/api/aqi/city` endpoint is unreliable due to IQAir API limitations.

# AQI PM2.5 API Backend (IQAir Edition)

A complete RESTful API backend for serving air quality data from **IQAir** to multiple clients with user authentication, favorites, alerts, and caching.

## Features

- ✅ **Real-time AQI Data** - Fetch PM2.5 and pollutant data from IQAir
- 🔐 **User Authentication** - JWT-based auth with bcrypt password hashing
- ⭐ **Favorite Locations** - Users can save and manage favorite cities
- 🔔 **Alerts System** - Set custom thresholds for air quality alerts
- 💾 **Smart Caching** - 5-minute cache to reduce API calls and improve performance
- 🚀 **Rate Limiting** - Prevent abuse with built-in rate limiting
- 📊 **Batch Requests** - Fetch multiple cities at once
- 🗄️ **MongoDB Storage** - Store users, favorites, alerts, and historical data
- 🔒 **Security** - Helmet.js, CORS, input validation
- 🌍 **Browse by Location** - Get countries, states, and cities hierarchically

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcryptjs
- **Caching**: node-cache
- **Security**: Helmet, CORS, express-rate-limit
- **Data Source**: IQAir API (https://www.iqair.com)

## Installation

### 1. Get IQAir API Key

Sign up for a free API key at: https://www.iqair.com/dashboard/api

IQAir offers:
- **Community Edition**: Free, 10,000 calls/month (good for testing)
- **Startup Edition**: $29/month, 200,000 calls/month
- **Business Edition**: Custom pricing

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
```
IQAIR_API_KEY=your-iqair-api-key-here
MONGODB_URI=mongodb://localhost:27017/aqi-api
JWT_SECRET=your-super-secret-jwt-key
```

### 4. Start MongoDB

```bash
# Local MongoDB
mongod

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

### 5. Run the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server will start at `http://localhost:3000`

## API Endpoints

### Health Check

```
GET /health
```

### AQI Endpoints

#### Get Nearest City by Coordinates

```
GET /api/aqi/nearby?lat=40.7128&lon=-74.0060&radius=50
```

Returns the nearest city with air quality data. Note: IQAir API returns only the nearest city, not multiple nearby stations.

#### Get Specific City Data

```
GET /api/aqi/city?city=Los Angeles&state=California&country=USA
```

For cities without states (e.g., London, UK):
```
GET /api/aqi/city?city=London&country=United Kingdom
```

#### Get Current Location

```
GET /api/aqi/current?lat=40.7128&lon=-74.0060
```

Returns air quality for the nearest city to the coordinates.

#### Browse Available Locations

Get list of countries:
```
GET /api/aqi/countries
```

Get states in a country:
```
GET /api/aqi/states?country=USA
```

Get cities in a state:
```
GET /api/aqi/cities?state=California&country=USA
```

#### Batch Request

```
POST /api/aqi/batch
Content-Type: application/json

{
  "cities": [
    { "city": "Los Angeles", "state": "California", "country": "USA" },
    { "city": "New York", "state": "New York", "country": "USA" },
    { "city": "London", "country": "United Kingdom" }
  ]
}
```

Get multiple cities at once (max 20).

#### Cache Management

Clear cache:
```
DELETE /api/aqi/cache
```

Get cache statistics:
```
GET /api/aqi/cache/stats
```

### User Authentication

#### Register

```
POST /api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

#### Login

```
POST /api/users/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

Returns JWT token.

#### Get Profile

```
GET /api/users/me
Authorization: Bearer YOUR_JWT_TOKEN
```

### Favorites

All endpoints require authentication.

#### Get All Favorites

```
GET /api/favorites
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Add Favorite City

```
POST /api/favorites
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Home - Los Angeles",
  "lat": 34.0522,
  "lon": -118.2437
}
```

### Alerts

#### Create Alert

```
POST /api/alerts
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "locationId": "favorite_location_id",
  "threshold": 100,
  "pollutant": "aqi",
  "notificationMethod": "email"
}
```

## Response Format

Successful response:
```json
{
  "success": true,
  "data": {
    "stationId": "los-angeles-california-usa",
    "name": "Los Angeles, California, USA",
    "city": "Los Angeles",
    "state": "California",
    "country": "USA",
    "coordinates": {
      "lat": 34.0522,
      "lon": -118.2437
    },
    "aqi": {
      "us": 45,
      "cn": 34
    },
    "mainPollutant": "p2",
    "category": {
      "level": "Good",
      "health": "Air quality is satisfactory...",
      "color": "#00e400",
      "textColor": "#ffffff"
    },
    "weather": {
      "temperature": 22,
      "humidity": 65,
      "pressure": 1013,
      "wind": 3.6,
      "windDirection": 270,
      "icon": "01d"
    },
    "time": {
      "timestamp": "2024-02-01T12:00:00.000Z",
      "timezone": null
    }
  }
}
```

Error response:
```json
{
  "error": "Error message here"
}
```

## IQAir vs WAQI Differences

### Data Structure
- **IQAir** provides: City-level data, both US and China AQI, weather data
- **WAQI** provides: Station-level data, only US AQI, individual pollutants

### Coverage
- **IQAir**: Covers major cities worldwide (80+ countries)
- **WAQI**: More granular station coverage

### Endpoints
- **IQAir**: Hierarchical browse (countries → states → cities)
- **WAQI**: Geographic search by coordinates

### Limitations
- IQAir free tier: 10,000 calls/month
- Nearest city only returns 1 result (not multiple nearby)
- Individual pollutant levels (PM2.5, PM10, etc.) require higher tier plans

## Frontend Integration Example

```javascript
// Get nearest city
const getNearestCity = async (lat, lon) => {
  const response = await fetch(
    `http://localhost:3000/api/aqi/nearby?lat=${lat}&lon=${lon}`
  );
  return response.json();
};

// Get specific city
const getCityAQI = async (city, state, country) => {
  const params = new URLSearchParams({ city, country });
  if (state) params.append('state', state);
  
  const response = await fetch(
    `http://localhost:3000/api/aqi/city?${params}`
  );
  return response.json();
};

// Browse cities
const browseLocations = async () => {
  // Get countries
  const countries = await fetch('http://localhost:3000/api/aqi/countries').then(r => r.json());
  
  // Get states in USA
  const states = await fetch('http://localhost:3000/api/aqi/states?country=USA').then(r => r.json());
  
  // Get cities in California
  const cities = await fetch('http://localhost:3000/api/aqi/cities?state=California&country=USA').then(r => r.json());
  
  return { countries, states, cities };
};

// Batch request
const getBatchCities = async (cityList) => {
  const response = await fetch('http://localhost:3000/api/aqi/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cities: cityList })
  });
  return response.json();
};
```

## Deployment

Same as before - deploy to Heroku, Railway, Render, or any Node.js hosting.

Remember to:
1. Set `IQAIR_API_KEY` environment variable
2. Use production MongoDB instance
3. Set strong `JWT_SECRET`
4. Configure CORS for your domain

## API Rate Limits

IQAir Community Edition limits:
- 10,000 calls/month
- ~333 calls/day
- ~14 calls/hour

**Recommendation**: Cache aggressively (current: 5 minutes). For production with many users, consider:
- Increasing cache duration to 10-15 minutes
- Implementing user-based rate limiting
- Upgrading to IQAir Startup Edition ($29/month)

## Future Enhancements

- [ ] Historical data tracking
- [ ] Predictive analytics
- [ ] Push notifications for alerts
- [ ] City comparison dashboard
- [ ] Integration with multiple AQI sources
- [ ] GraphQL API
- [ ] WebSocket real-time updates
- [ ] Mobile app

## License

MIT

## Support

For IQAir API issues: https://www.iqair.com/dashboard/api
For this project: Open an issue on GitHub
