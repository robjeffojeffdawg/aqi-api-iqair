# AQI PM2.5 API Backend

A complete RESTful API backend for serving air quality data to multiple clients with user authentication, favorites, alerts, and caching.

## Features

- ✅ **Real-time AQI Data** - Fetch PM2.5 and other pollutant data from WAQI
- 🔐 **User Authentication** - JWT-based auth with bcrypt password hashing
- ⭐ **Favorite Locations** - Users can save and manage favorite locations
- 🔔 **Alerts System** - Set custom thresholds for air quality alerts
- 💾 **Smart Caching** - 5-minute cache to reduce API calls and improve performance
- 🚀 **Rate Limiting** - Prevent abuse with built-in rate limiting
- 📊 **Batch Requests** - Fetch multiple stations at once
- 🗄️ **MongoDB Storage** - Store users, favorites, alerts, and historical data
- 🔒 **Security** - Helmet.js, CORS, input validation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcryptjs
- **Caching**: node-cache
- **Security**: Helmet, CORS, express-rate-limit

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
- Get a WAQI API token from https://aqicn.org/data-platform/token/
- Set up MongoDB (local or cloud like MongoDB Atlas)
- Change JWT_SECRET to a strong random string

### 3. Start MongoDB

Make sure MongoDB is running:

```bash
# Local MongoDB
mongod

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

### 4. Run the Server

```bash
# Development mode with auto-reload
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

Returns server status and uptime.

### AQI Endpoints

#### Get Nearby Stations

```
GET /api/aqi/nearby?lat=40.7128&lon=-74.0060&radius=50
```

Parameters:
- `lat` (required) - Latitude
- `lon` (required) - Longitude
- `radius` (optional) - Search radius in km (default: 50)

#### Get Station Details

```
GET /api/aqi/station/:id
```

Returns detailed data for a specific station including pollutants and weather.

#### Search by City

```
GET /api/aqi/search?city=London
```

#### Get Current Location (IP-based)

```
GET /api/aqi/current
```

#### Batch Request

```
POST /api/aqi/batch
Content-Type: application/json

{
  "stationIds": ["123", "456", "789"]
}
```

Get multiple stations at once (max 20).

#### Clear Cache

```
DELETE /api/aqi/cache
```

Clear the internal cache.

#### Cache Statistics

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

Returns a JWT token to use in subsequent requests.

#### Get Profile

```
GET /api/users/me
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Update Profile

```
PUT /api/users/me
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "newemail@example.com"
}
```

#### Change Password

```
PUT /api/users/password
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

### Favorites

All favorites endpoints require authentication (Bearer token).

#### Get All Favorites

```
GET /api/favorites
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Add Favorite

```
POST /api/favorites
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Home",
  "lat": 40.7128,
  "lon": -74.0060,
  "stationId": "123"
}
```

#### Get Favorite

```
GET /api/favorites/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Update Favorite

```
PUT /api/favorites/:id
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Updated Home"
}
```

#### Delete Favorite

```
DELETE /api/favorites/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

### Alerts

All alerts endpoints require authentication.

#### Get All Alerts

```
GET /api/alerts
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Create Alert

```
POST /api/alerts
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "locationId": "favorite_location_id",
  "threshold": 100,
  "pollutant": "pm25",
  "notificationMethod": "email"
}
```

#### Get Alert

```
GET /api/alerts/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Update Alert

```
PUT /api/alerts/:id
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "threshold": 150,
  "enabled": true
}
```

#### Toggle Alert

```
POST /api/alerts/:id/toggle
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Delete Alert

```
DELETE /api/alerts/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

## Response Format

All successful responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

Error responses:

```json
{
  "error": "Error message here"
}
```

## Frontend Integration Example

```javascript
// Login and get token
const login = async (email, password) => {
  const response = await fetch('http://localhost:3000/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  localStorage.setItem('token', data.data.token);
  return data;
};

// Get nearby AQI data
const getNearbyAQI = async (lat, lon) => {
  const response = await fetch(
    `http://localhost:3000/api/aqi/nearby?lat=${lat}&lon=${lon}&radius=50`
  );
  return response.json();
};

// Add favorite (requires auth)
const addFavorite = async (name, lat, lon) => {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/api/favorites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name, lat, lon })
  });
  return response.json();
};
```

## Deployment

### Deploy to Heroku

```bash
heroku create your-aqi-api
heroku addons:create mongolab
heroku config:set JWT_SECRET=your-secret
heroku config:set WAQI_API_TOKEN=your-token
git push heroku main
```

### Deploy to Railway

```bash
railway init
railway add mongodb
railway up
```

### Deploy to Render

1. Create new Web Service
2. Connect your repository
3. Set environment variables
4. Deploy

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Email/SMS notifications for alerts
- [ ] Historical data collection and analysis
- [ ] GraphQL API
- [ ] Admin dashboard
- [ ] Data export (CSV, JSON)
- [ ] Integration with other AQI APIs
- [ ] Machine learning predictions
- [ ] Mobile app (React Native)

## Security Notes

⚠️ **Important for Production:**

1. Change `JWT_SECRET` to a strong random string
2. Use HTTPS only
3. Set appropriate CORS origins
4. Enable MongoDB authentication
5. Use environment-specific configs
6. Implement proper logging
7. Add request validation middleware
8. Set up monitoring (PM2, New Relic, etc.)
9. Regular security audits
10. Rate limit per user, not just per IP

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
