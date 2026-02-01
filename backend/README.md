# Currency Exchange Rate Tracker - Backend

A robust Node.js/Express backend API for fetching real-time currency exchange rates with intelligent caching, multi-source aggregation, and graceful degradation.

## Features

- **Multi-source data aggregation**: Fetches rates from 3 parallel APIs
- **Intelligent conflict resolution**: Averages rates when sources agree, uses freshest when timestamps differ
- **Smart caching**: 5-minute cache with background refresh at 4 minutes
- **Graceful degradation**: Returns stale data if APIs fail, with clear status indicators
- **Health monitoring**: Built-in health check endpoint with cache statistics

## Architecture

### Modules

1. **[server.js](server.js)** - Express server with REST endpoints
2. **[fetcher.js](fetcher.js)** - Parallel API fetching with timeout handling
3. **[resolver.js](resolver.js)** - Conflict resolution logic for multi-source data
4. **[cache.js](cache.js)** - In-memory cache with TTL support

### Data Flow

```
Client Request → Cache Check → Return Fresh Cache (if valid)
                             ↓
                    Fetch from 3 APIs in Parallel
                             ↓
                    Resolve Conflicts
                             ↓
                    Update Cache → Return to Client
```

## API Endpoints

### GET /api/rates

Fetch current exchange rates for USD to 10 major currencies.

**Response (Success - Live Data)**
```json
{
  "status": "live",
  "base": "USD",
  "currencies": ["EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "MXN", "BRL"],
  "rates": {
    "EUR": 0.84073,
    "GBP": 0.72856,
    "JPY": 154.313647,
    ...
  },
  "timestamp": 1769904151000,
  "sources": ["exchangerate-api", "open.er-api", "frankfurter"],
  "resolution": "averaged",
  "cached": true,
  "cacheAge": 112279
}
```

**Response (Stale Data)**
```json
{
  "status": "stale",
  "warning": "Data may be outdated. Live sources are temporarily unavailable.",
  ...
}
```

**Response (Unavailable - 503)**
```json
{
  "status": "unavailable",
  "error": "Exchange rate data is temporarily unavailable. Please try again later.",
  "retryAfter": 30
}
```

### GET /api/health

Health check with cache statistics.

**Response**
```json
{
  "status": "ok",
  "uptime": 883.0482234,
  "cache": {
    "hasData": true,
    "timestamp": 1769930855057,
    "age": 879729,
    "isStale": true,
    "isRefreshing": false
  }
}
```

### GET /api/currencies

List supported currencies.

**Response**
```json
{
  "base": "USD",
  "targets": ["EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "MXN", "BRL"]
}
```

## Installation

```bash
cd backend
npm install
```

## Usage

### Start the server
```bash
npm start
```

### Development mode (with auto-reload)
```bash
npm run dev
```

The server runs on `http://localhost:3001` by default.

## Configuration

Environment variables:
- `PORT` - Server port (default: 3001)

## Caching Strategy

- **TTL**: 5 minutes (300,000ms)
- **Refresh Threshold**: 4 minutes (240,000ms)
- **Behavior**:
  - Fresh cache (< 4 min): Return immediately
  - Near expiry (4-5 min): Return cache + trigger background refresh
  - Stale cache (> 5 min): Fetch fresh data
  - APIs fail: Return stale cache with warning
  - No cache + APIs fail: Return 503 error

## Conflict Resolution

When multiple API sources return data:

1. **Single source**: Use directly
2. **Timestamps differ > 1 hour**: Use freshest source
3. **Timestamps within 1 hour**: Average all rates

## Data Sources

1. **exchangerate-api** - `https://open.exchangerate-api.com`
2. **open.er-api** - `https://open.er-api.com`
3. **frankfurter** - `https://api.frankfurter.app`

All requests have a 5-second timeout and run in parallel.

## Error Handling

- Network timeouts: Gracefully ignored, other sources used
- All APIs fail: Return cached data (if available) or 503
- Invalid JSON: Source skipped, logged to console
- Cache miss on startup: Pre-warm attempted, retries on first request

## Testing

```bash
# Test rates endpoint
curl http://localhost:3001/api/rates

# Test health check
curl http://localhost:3001/api/health

# Test currencies list
curl http://localhost:3001/api/currencies
```

## Dependencies

- `express` - Web framework
- `cors` - CORS middleware
- `node-fetch` - HTTP client

## License

ISC
