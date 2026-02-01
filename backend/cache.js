/**
 * In-memory cache with TTL support
 * Stores exchange rates with timestamp for freshness tracking
 */

export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
export const REFRESH_THRESHOLD = 4 * 60 * 1000; // 4 minutes - trigger background refresh

let cache = {
  data: null,
  timestamp: null,
  isRefreshing: false
};

/**
 * Get cached data if valid
 * @returns {Object|null} Cached rates data or null if expired/empty
 */
export function get() {
  if (!cache.data || !cache.timestamp) {
    return null;
  }

  const age = Date.now() - cache.timestamp;

  // Return cached data even if stale (for graceful degradation)
  return {
    data: cache.data,
    timestamp: cache.timestamp,
    age,
    isStale: age > CACHE_TTL,
    needsRefresh: age > REFRESH_THRESHOLD
  };
}

/**
 * Set cache data
 * @param {Object} data - Exchange rates data to cache
 */
export function set(data) {
  cache.data = data;
  cache.timestamp = Date.now();
}

/**
 * Check if background refresh is in progress
 * @returns {boolean}
 */
export function isRefreshing() {
  return cache.isRefreshing;
}

/**
 * Set refreshing state to prevent concurrent refreshes
 * @param {boolean} state
 */
export function setRefreshing(state) {
  cache.isRefreshing = state;
}

/**
 * Clear the cache (useful for testing)
 */
export function clear() {
  cache = {
    data: null,
    timestamp: null,
    isRefreshing: false
  };
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getStats() {
  const cached = get();
  return {
    hasData: !!cache.data,
    timestamp: cache.timestamp,
    age: cached ? cached.age : null,
    isStale: cached ? cached.isStale : null,
    isRefreshing: cache.isRefreshing
  };
}
