# AnchorFX - Currency Exchange Rate Tracker

A full-stack application for tracking real-time currency exchange rates with intelligent caching, multi-source data aggregation, and a modern UI.

## Overview

AnchorFX provides reliable, up-to-date currency exchange rates by:
- Fetching data from multiple API sources in parallel
- Intelligently resolving conflicts between sources
- Caching data with background refresh
- Gracefully degrading when sources are unavailable
- Displaying status clearly with visual indicators

## Architecture

![Application Flow](application_flow.png)

The application follows a multi-layered architecture:

1. **React Frontend** - Fluent UI-based interface with auto-refresh
2. **Node.js Backend** - Express server with caching and orchestration
3. **Cache Layer** - 5-minute TTL with background refresh
4. **Parallel Fetch** - Simultaneous API calls to 3 sources
5. **Response Resolver** - Intelligent conflict resolution
6. **External APIs** - Multiple free exchange rate sources

## Features

### Backend
- **Multi-source aggregation**: Fetches from 3 APIs simultaneously
- **Smart caching**: 5-minute TTL with 4-minute background refresh
- **Conflict resolution**: Averages rates or uses freshest source
- **Graceful degradation**: Returns stale data if APIs fail
- **RESTful API**: Clean, documented endpoints

### Frontend
- **Modern UI**: Built with Fluent UI components
- **Real-time updates**: Auto-refreshes every 30 seconds
- **Status indicators**: Clear visual feedback (Live/Stale/Unavailable)
- **Responsive design**: Works on mobile, tablet, and desktop
- **Error handling**: User-friendly error states

## Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Clone the repository
```bash
cd currency-exchange-rate-tracker
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

### Running the Application

1. Start the backend (Terminal 1)
```bash
cd backend
npm start
```
Backend runs on [http://localhost:3001](http://localhost:3001)

2. Start the frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Frontend runs on [http://localhost:5173](http://localhost:5173)

3. Open your browser to [http://localhost:5173](http://localhost:5173)

## Project Structure

```
currency-exchange-rate-tracker/
├── backend/
│   ├── server.js           # Express server
│   ├── fetcher.js          # API fetching logic
│   ├── resolver.js         # Conflict resolution
│   ├── cache.js            # Caching layer
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API client
│   │   ├── App.jsx         # Main app
│   │   └── main.jsx        # Entry point
│   ├── package.json
│   └── README.md
│
└── README.md               # This file
```

## API Endpoints

### Backend API

#### GET /api/rates
Fetch current exchange rates

**Response (Live)**
```json
{
  "status": "live",
  "base": "USD",
  "rates": {
    "EUR": 0.84073,
    "GBP": 0.72856,
    "JPY": 154.313647,
    ...
  },
  "timestamp": 1769904151000,
  "sources": ["exchangerate-api", "open.er-api", "frankfurter"],
  "resolution": "averaged",
  "cached": true
}
```

**Response (Stale)**
```json
{
  "status": "stale",
  "warning": "Data may be outdated...",
  ...
}
```

**Response (Unavailable - 503)**
```json
{
  "status": "unavailable",
  "error": "Exchange rate data is temporarily unavailable...",
  "retryAfter": 30
}
```

#### GET /api/health
Health check with cache statistics

#### GET /api/currencies
List of supported currencies

## Supported Currencies

**Base**: USD (US Dollar)

**Targets**:
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- CHF (Swiss Franc)
- CNY (Chinese Yuan)
- INR (Indian Rupee)
- MXN (Mexican Peso)
- BRL (Brazilian Real)

## Data Sources

1. **exchangerate-api** - `https://open.exchangerate-api.com`
2. **open.er-api** - `https://open.er-api.com`
3. **frankfurter** - `https://api.frankfurter.app`

All APIs are:
- Free and open
- No authentication required
- Rate-limit friendly

## Caching Strategy

- **Cache TTL**: 5 minutes
- **Refresh Threshold**: 4 minutes
- **Behavior**:
  - 0-4 min: Return cache immediately
  - 4-5 min: Return cache + trigger background refresh
  - 5+ min: Fetch fresh data
  - APIs fail: Return stale cache with warning
  - No cache + APIs fail: Return 503 error

## Conflict Resolution

When multiple sources return data:

1. **Single source**: Use directly
2. **Timestamps differ > 1 hour**: Use freshest source only
3. **Timestamps within 1 hour**: Average all rates

## Development

### Backend Development
```bash
cd backend
npm run dev  # Auto-reload with --watch flag
```

### Frontend Development
```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

### Build for Production

Backend:
```bash
cd backend
# Already production-ready, just run: npm start
```

Frontend:
```bash
cd frontend
npm run build      # Build to dist/
npm run preview    # Preview production build
```

## Environment Variables

### Backend
```env
PORT=3001  # Server port (default: 3001)
```

### Frontend
```env
VITE_API_URL=http://localhost:3001  # Backend URL
```

## Testing

### Manual Testing

1. **Test Live State**: Start both servers, verify green "LIVE" badge
2. **Test Stale State**: Stop backend, wait 5+ minutes, restart frontend
3. **Test Unavailable State**: Stop backend completely
4. **Test Auto-refresh**: Watch status badge update every 30 seconds

### API Testing
```bash
# Test rates endpoint
curl http://localhost:3001/api/rates

# Test health check
curl http://localhost:3001/api/health

# Test currencies list
curl http://localhost:3001/api/currencies
```

## Key Technologies

### Backend
- Express 5.x
- Node-fetch 3.x
- CORS middleware

### Frontend
- React 18
- Vite 7.x
- Fluent UI (React Components)
- Fluent UI Icons

## Performance

- **Backend**: <100ms response time (with cache)
- **Frontend**: ~100KB gzipped bundle
- **API Timeout**: 5 seconds per source
- **Auto-refresh**: 30 seconds interval

## Error Handling

- Network timeouts: Gracefully skipped
- All APIs fail: Stale cache returned
- No cache available: 503 error with retry info
- Invalid JSON: Source skipped, logged

## Future Enhancements

- [ ] Add more currency pairs
- [ ] Historical rate charts
- [ ] Currency conversion calculator
- [ ] Multiple base currency support
- [ ] Dark mode
- [ ] Rate change notifications
- [ ] Export to CSV/Excel
- [ ] WebSocket for real-time updates

## License

ISC

## Support

For issues or questions, please check:
- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)

---

**Built with ❤️ using React, Node.js, and Fluent UI**
