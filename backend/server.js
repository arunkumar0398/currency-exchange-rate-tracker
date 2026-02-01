/**
 * Exchange Rate Tracker - Backend Server
 * Provides a single endpoint for fetching currency exchange rates
 * with caching, multi-source aggregation, and graceful degradation
 */

import express from 'express';
import cors from 'cors';
import { fetchAllSources, BASE_CURRENCY, TARGET_CURRENCIES } from './fetcher.js';
import { resolveRates } from './resolver.js';
import * as cache from './cache.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

/**
 * Fetch fresh rates from APIs and update cache
 * @returns {Promise<Object|null>} Resolved rates or null on failure
 */
async function refreshRates() {
  if (cache.isRefreshing()) {
    console.log('Refresh already in progress, skipping...');
    return null;
  }

  cache.setRefreshing(true);

  try {
    const sources = await fetchAllSources();
    const resolved = resolveRates(sources);

    if (resolved) {
      cache.set(resolved);
      console.log('Cache updated successfully');
    }

    return resolved;
  } catch (error) {
    console.error('Error refreshing rates:', error.message);
    return null;
  } finally {
    cache.setRefreshing(false);
  }
}

/**
 * Trigger background refresh if cache is near expiry
 * @param {Object} cached - Current cache state
 */
function triggerBackgroundRefresh(cached) {
  if (cached && cached.needsRefresh && !cache.isRefreshing()) {
    console.log('Triggering background refresh (cache near expiry)');
    refreshRates().catch(err => {
      console.error('Background refresh failed:', err.message);
    });
  }
}

/**
 * GET /api/rates
 * Returns current exchange rates with status information
 *
 * Response statuses:
 * - "live": Fresh data from API sources
 * - "stale": Cached data (APIs unavailable but cache exists)
 * - "unavailable": No data available (all sources failed, no cache)
 */
app.get('/api/rates', async (req, res) => {
  console.log('\n--- GET /api/rates ---');

  const cached = cache.get();

  // If we have valid (non-stale) cached data, return it
  if (cached && !cached.isStale) {
    console.log('Returning fresh cached data');
    triggerBackgroundRefresh(cached);

    return res.json({
      status: 'live',
      base: BASE_CURRENCY,
      currencies: TARGET_CURRENCIES,
      rates: cached.data.rates,
      timestamp: cached.data.timestamp,
      sources: cached.data.sources,
      resolution: cached.data.resolution,
      cached: true,
      cacheAge: cached.age
    });
  }

  // Try to fetch fresh data
  console.log('Fetching fresh data...');
  const freshData = await refreshRates();

  if (freshData) {
    console.log('Returning fresh API data');
    return res.json({
      status: 'live',
      base: BASE_CURRENCY,
      currencies: TARGET_CURRENCIES,
      rates: freshData.rates,
      timestamp: freshData.timestamp,
      sources: freshData.sources,
      resolution: freshData.resolution,
      cached: false
    });
  }

  // Fresh fetch failed - check if we have stale cached data
  if (cached) {
    console.log('Returning stale cached data (APIs unavailable)');
    return res.json({
      status: 'stale',
      base: BASE_CURRENCY,
      currencies: TARGET_CURRENCIES,
      rates: cached.data.rates,
      timestamp: cached.data.timestamp,
      sources: cached.data.sources,
      resolution: cached.data.resolution,
      cached: true,
      cacheAge: cached.age,
      warning: 'Data may be outdated. Live sources are temporarily unavailable.'
    });
  }

  // No data available at all
  console.log('No data available (all sources failed, no cache)');
  return res.status(503).json({
    status: 'unavailable',
    base: BASE_CURRENCY,
    currencies: TARGET_CURRENCIES,
    error: 'Exchange rate data is temporarily unavailable. Please try again later.',
    retryAfter: 30 // Suggest retry after 30 seconds
  });
});

/**
 * GET /api/health
 * Health check endpoint with cache statistics
 */
app.get('/api/health', (req, res) => {
  const stats = cache.getStats();

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    cache: stats
  });
});

/**
 * GET /api/currencies
 * Returns list of supported currencies
 */
app.get('/api/currencies', (req, res) => {
  res.json({
    base: BASE_CURRENCY,
    targets: TARGET_CURRENCIES
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\nExchange Rate Tracker API running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET /api/rates      - Fetch exchange rates`);
  console.log(`  GET /api/health     - Health check`);
  console.log(`  GET /api/currencies - List supported currencies`);
  console.log(`\nBase currency: ${BASE_CURRENCY}`);
  console.log(`Target currencies: ${TARGET_CURRENCIES.join(', ')}`);

  // Pre-warm cache on startup
  console.log('\nPre-warming cache...');
  refreshRates().then(result => {
    if (result) {
      console.log('Cache pre-warmed successfully');
    } else {
      console.log('Cache pre-warm failed - will retry on first request');
    }
  });
});

export default app;
