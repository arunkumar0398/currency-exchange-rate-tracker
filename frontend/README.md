# AnchorFX Frontend

Modern React frontend for the Currency Exchange Rate Tracker, built with Vite and Fluent UI.

## Overview

This is the user-facing interface for AnchorFX, providing real-time currency exchange rate information with a clean, professional design powered by Microsoft's Fluent UI design system.

## Features

- **Real-time Updates**: Auto-refreshes rates every 30 seconds
- **Status Indicators**: Visual badges showing data freshness (Live/Stale/Unavailable)
- **Responsive Grid**: Clean card-based layout for currency pairs
- **Warning System**: Clear alerts when data is outdated or unavailable
- **Error Handling**: Graceful degradation with user-friendly error states
- **Modern UI**: Built with Microsoft Fluent UI components
- **Fluent Design**: Consistent with Microsoft 365 design language

## Tech Stack

- **React 18** - UI framework with hooks
- **Vite 7.x** - Lightning-fast build tool and dev server
- **Fluent UI React Components** - Microsoft's design system
- **Fluent UI React Icons** - Official icon library
- **ES6+ Modules** - Modern JavaScript

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Header.jsx          # App header with AnchorFX branding
│   │   ├── Header.css
│   │   ├── StatusBadge.jsx     # Live/Stale/Unavailable indicator
│   │   ├── StatusBadge.css
│   │   ├── WarningBanner.jsx   # Warning message for stale data
│   │   ├── WarningBanner.css
│   │   ├── RateCard.jsx        # Individual currency pair card
│   │   ├── RateCard.css
│   │   ├── RatesGrid.jsx       # Grid layout for rate cards
│   │   ├── RatesGrid.css
│   │   ├── ErrorState.jsx      # Error/unavailable state display
│   │   └── ErrorState.css
│   ├── services/
│   │   └── api.js              # API client for backend
│   ├── App.jsx                 # Main application component
│   ├── App.css                 # Application styles
│   ├── index.css               # Global styles
│   └── main.jsx                # Application entry point
├── public/
├── index.html
├── package.json
├── vite.config.js
└── README.md                   # This file
```

## Components

### Header
**File**: [Header.jsx](src/components/Header.jsx)

Displays the application branding and base currency selector.

**Features**:
- AnchorFX logo with Fluent UI MoneyRegular icon
- Base currency dropdown (USD)
- Fluent UI styling

### StatusBadge
**File**: [StatusBadge.jsx](src/components/StatusBadge.jsx)

Visual indicator of data freshness with three states:

- **Live** (green): Fresh data from APIs
- **Stale** (yellow): Cached data, APIs unavailable
- **Unavailable** (red): No data available

Shows timestamp of last update with pulsing animation.

### WarningBanner
**File**: [WarningBanner.jsx](src/components/WarningBanner.jsx)

Fluent UI MessageBar component that appears when data is stale.

**Features**:
- Warning intent styling
- Custom warning message from backend
- Warning icon

### RateCard
**File**: [RateCard.jsx](src/components/RateCard.jsx)

Individual currency pair display using Fluent UI Card.

**Features**:
- Currency pair label (e.g., USD/EUR)
- Exchange rate with smart decimal formatting
- Hover animation
- Responsive design

**Decimal Formatting**:
- Large numbers (≥100): 2 decimals
- Standard numbers (≥1): 4 decimals
- Small numbers (<1): 6 decimals

### RatesGrid
**File**: [RatesGrid.jsx](src/components/RatesGrid.jsx)

Responsive grid layout for displaying all rate cards.

**Features**:
- Auto-adjusting columns based on screen size
- Section title
- Responsive gap spacing

### ErrorState
**File**: [ErrorState.jsx](src/components/ErrorState.jsx)

Shown when no data is available.

**Features**:
- Disconnected plug icon (Fluent UI)
- User-friendly error message
- Optional retry countdown

## Installation

```bash
cd frontend
npm install
```

## Development

Start the dev server with hot module replacement:

```bash
npm run dev
```

Runs on `http://localhost:5173`

## Build

Build for production:

```bash
npm run build
```

Outputs optimized bundle to `dist/` directory.

## Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3001
```

**Default**: `http://localhost:3001`

## API Integration

The frontend communicates with the backend via the API service:

### Endpoints Used

- `GET /api/rates` - Fetch current exchange rates
- `GET /api/health` - Backend health check (future use)
- `GET /api/currencies` - Supported currencies (future use)

### Response Handling

**Success (200)**:
```javascript
{
  status: 'live',
  rates: { EUR: 0.84, GBP: 0.73, ... },
  timestamp: 1769904151000,
  sources: ['exchangerate-api', 'open.er-api'],
  cached: true
}
```

**Stale Data**:
```javascript
{
  status: 'stale',
  warning: 'Data may be outdated...',
  rates: { ... }
}
```

**Unavailable (503)**:
```javascript
{
  status: 'unavailable',
  error: 'Exchange rate data is temporarily unavailable...',
  retryAfter: 30
}
```

## Application States

### 1. Loading State
- Fluent UI Spinner
- "Loading exchange rates..." message
- Shown during initial data fetch

### 2. Live State
- Green "LIVE" badge
- Grid of currency rate cards
- Data sources in footer
- Auto-refresh active

### 3. Stale State
- Yellow "STALE" badge
- Warning banner at top
- Grid of currency rate cards (outdated)
- Data age displayed

### 4. Unavailable State
- Error card with disconnected icon
- Error message
- Retry countdown
- No rate cards shown

### 5. Error State
- Network error handling
- Fallback to previous data if available
- User-friendly error messages

## Auto-Refresh Behavior

- **Interval**: 30 seconds
- **Method**: Polling via `setInterval`
- **Behavior**: Non-blocking background updates
- **On Error**: Continues trying, doesn't break the UI

## Supported Currencies

**Base**: USD

**Targets** (10 major currency pairs):
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

## Responsive Design

### Breakpoints

- **Mobile**: < 768px (single column)
- **Tablet**: 768px - 1024px (2-3 columns)
- **Desktop**: > 1024px (4+ columns)

### Grid Behavior

```css
grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
```

Auto-adjusts column count based on available space.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Initial Load**: ~100KB gzipped
- **Render Time**: < 100ms (first contentful paint)
- **Update Time**: < 50ms (re-renders)
- **Bundle Size**: Optimized with Vite code splitting

### Optimization Techniques

- Lazy loading of Fluent UI components
- Efficient re-rendering with React hooks
- CSS-in-JS with minimal runtime overhead
- Vite's automatic code splitting

## Accessibility

- Semantic HTML structure
- ARIA labels from Fluent UI
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support (Windows)
- Focus indicators on interactive elements

## Styling

### Global Styles
**File**: [index.css](src/index.css)

- CSS reset
- Segoe UI font family
- Base typography
- Color variables

### Component Styles
Each component has its own CSS file for scoped styling.

### Fluent UI Theme
Uses `webLightTheme` from Fluent UI for consistent design.

## Development Tools

- **Vite HMR**: Instant updates during development
- **ESLint**: Code quality (configured by Vite)
- **React DevTools**: Component inspection

## Scripts

```json
{
  "dev": "vite",              // Start dev server
  "build": "vite build",      // Build for production
  "preview": "vite preview"   // Preview production build
}
```

## Troubleshooting

### Port Already in Use
Change the port in `vite.config.js`:
```javascript
export default {
  server: {
    port: 5174
  }
}
```

### API Connection Failed
- Ensure backend is running on port 3001
- Check `VITE_API_URL` environment variable
- Verify CORS is enabled on backend

### Slow Auto-Refresh
- Check network tab for API latency
- Verify backend cache is working
- Consider increasing refresh interval

## Future Enhancements

- [ ] Dark mode support
- [ ] Currency conversion calculator
- [ ] Historical rate charts (Chart.js integration)
- [ ] Multiple base currency selection
- [ ] Rate change animations
- [ ] Export to CSV/Excel
- [ ] PWA support (offline mode)
- [ ] Notifications for rate changes
- [ ] Customizable refresh interval

## Contributing

When adding new components:

1. Create component file in `src/components/`
2. Add corresponding CSS file
3. Use Fluent UI components where possible
4. Follow existing naming conventions
5. Add JSDoc comments

## License

ISC

---

**Built with React, Vite, and Fluent UI**
