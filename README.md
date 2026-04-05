# AnchorFX - Currency Exchange Rate Tracker

A full-stack application for tracking real-time currency exchange rates with intelligent caching, multi-source data aggregation, and a modern UI.

## Overview

AnchorFX provides reliable, up-to-date currency exchange rates by:
- Fetching data from multiple API sources in parallel
- Intelligently resolving conflicts between sources
- Caching data with background refresh
- Gracefully degrading when sources are unavailable
- Displaying status clearly with visual indicators

## Initial Thoughts

The main problem is that free-tier forex APIs don't always work, which makes users lose faith before they switch to paid. A layer of reliability on top of free APIs, not better ones, will fix the problem.

My first idea was to get data from three different APIs at once, store it heavily, and let the user know how up-to-date the data is. If all three APIs fail at once, instead of a hard error, show old cached data with a warning."Stale but visible" is better for user experience than "broken and empty."

The caching strategy (5-minute TTL, 4-minute background pre-refresh) means that most requests get data that's only seconds old right away, even though the APIs update every day. This makes the UI feel "live" without putting too much stress on the APIs.

The interesting problem was how to resolve conflicts: when three APIs give you slightly different rates, do you choose one or average them? When timestamps are close (they're all coming from the same market), I chose to average them. When timestamps are very different, I chose to use the newest source. This stops you from accidentally mixing old data with new data.

I got rid of the currency converter, historical charts, user accounts, and dark mode. None of these solve the main issue, which is trust and reliability. Sent the least amount that answers the question, "Can I trust what I see?"

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

## Deployment

### Render (Recommended for Backend)

**Deploy Backend:**

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure the service:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
4. Click **Create Web Service** — deploys in ~2-3 minutes

**Verify deployment:**
```bash
curl https://your-app.onrender.com/api/health
```

**Backend URL:**
Your backend will be available at: `https://your-app.onrender.com`

### Vercel (Recommended for Frontend)

**Deploy Frontend:**

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy from Frontend Directory**:
   ```bash
   cd frontend
   vercel
   ```

3. **Set Environment Variables**:
   - `VITE_API_URL` = Your Render backend URL
   - Example: `https://anchorfx-backend.onrender.com`

4. **Production Deploy**:
   ```bash
   vercel --prod
   ```

**Alternative: Vercel Dashboard**
- Connect GitHub repository
- Set root directory to `frontend`
- Add environment variable `VITE_API_URL`
- Deploy

### Other Deployment Options

**Backend Alternatives:**
- **Railway** - Docker-based deployment, free tier available
- **Heroku** - Classic PaaS (paid)
- **AWS Lambda** - Serverless (via adapter)
- **DigitalOcean App Platform** - Simple deployment

**Frontend Alternatives:**
- **Netlify** - Similar to Vercel
- **Cloudflare Pages** - Fast CDN
- **GitHub Pages** - Free static hosting
- **AWS S3 + CloudFront** - Scalable CDN

### Production Checklist

Before deploying to production:

- [ ] Set `PORT` environment variable for backend
- [ ] Set `VITE_API_URL` to production backend URL
- [ ] Enable CORS for production frontend domain
- [ ] Test all three states: live, stale, unavailable
- [ ] Monitor API rate limits
- [ ] Set up error logging (optional)
- [ ] Configure custom domain (optional)

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
