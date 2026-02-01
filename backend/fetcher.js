/**
 * Parallel API fetcher for exchange rates
 * Fetches from multiple sources simultaneously with timeout handling
 */

const TIMEOUT = 5000; // 5 seconds timeout per request
export const BASE_CURRENCY = 'USD';

// Target currencies for top 10 pairs
export const TARGET_CURRENCIES = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'MXN', 'BRL'];

/**
 * Filter rates to only include target currencies
 * @param {Object} rates - All rates from API
 * @returns {Object} Filtered rates
 */
function filterRates(rates) {
  const filtered = {};
  for (const currency of TARGET_CURRENCIES) {
    if (rates[currency] !== undefined) {
      filtered[currency] = rates[currency];
    }
  }
  return filtered;
}

/**
 * API source configurations
 */
export const API_SOURCES = {
  exchangeRateApi: {
    name: 'exchangerate-api',
    url: `https://open.exchangerate-api.com/v6/latest/${BASE_CURRENCY}`,
    parse: (data) => ({
      rates: filterRates(data.rates),
      timestamp: data.time_last_update_unix * 1000,
      source: 'exchangerate-api'
    })
  },
  openErApi: {
    name: 'open.er-api',
    url: `https://open.er-api.com/v6/latest/${BASE_CURRENCY}`,
    parse: (data) => ({
      rates: filterRates(data.rates),
      timestamp: data.time_last_update_unix * 1000,
      source: 'open.er-api'
    })
  },
  frankfurter: {
    name: 'frankfurter',
    url: `https://api.frankfurter.app/latest?from=${BASE_CURRENCY}`,
    parse: (data) => ({
      rates: filterRates(data.rates),
      timestamp: new Date(data.date).getTime(),
      source: 'frankfurter'
    })
  }
};

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetch from a single API source
 * @param {Object} source - API source configuration
 * @returns {Promise<Object|null>} Parsed data or null on failure
 */
async function fetchFromSource(source) {
  try {
    const response = await fetchWithTimeout(source.url, TIMEOUT);

    if (!response.ok) {
      console.error(`[${source.name}] HTTP error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const parsed = source.parse(data);
    console.log(`[${source.name}] Successfully fetched rates`);
    return parsed;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`[${source.name}] Request timed out`);
    } else {
      console.error(`[${source.name}] Fetch error:`, error.message);
    }
    return null;
  }
}

/**
 * Fetch rates from all sources in parallel
 * @returns {Promise<Object[]>} Array of successful results
 */
export async function fetchAllSources() {
  const sources = Object.values(API_SOURCES);

  console.log(`Fetching from ${sources.length} sources in parallel...`);

  const results = await Promise.all(
    sources.map(source => fetchFromSource(source))
  );

  // Filter out failed requests (null results)
  const successfulResults = results.filter(result => result !== null);

  console.log(`${successfulResults.length}/${sources.length} sources responded successfully`);

  return successfulResults;
}
