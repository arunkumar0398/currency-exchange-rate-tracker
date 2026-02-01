/**
 * Conflict resolution for exchange rates from multiple sources
 * Implements timestamp-aware logic for choosing the best data
 */

export const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Resolve conflicts between multiple rate sources
 *
 * Resolution logic:
 * - If timestamps differ by more than 1 hour: use the fresher source
 * - If timestamps are within 1 hour: average the rates
 * - If only one source: use it directly
 *
 * @param {Object[]} sources - Array of source results with rates and timestamps
 * @returns {Object} Resolved rates data
 */
export function resolveRates(sources) {
  if (!sources || sources.length === 0) {
    return null;
  }

  // Single source - use directly
  if (sources.length === 1) {
    return {
      rates: sources[0].rates,
      timestamp: sources[0].timestamp,
      sources: [sources[0].source],
      resolution: 'single-source'
    };
  }

  // Sort by timestamp (newest first)
  const sortedSources = [...sources].sort((a, b) => b.timestamp - a.timestamp);
  const newest = sortedSources[0];
  const oldest = sortedSources[sortedSources.length - 1];

  const timeDiff = newest.timestamp - oldest.timestamp;

  // If timestamps differ by more than 1 hour, use the freshest source
  if (timeDiff > ONE_HOUR) {
    console.log(`Timestamps differ by ${Math.round(timeDiff / 1000 / 60)} minutes - using freshest source: ${newest.source}`);
    return {
      rates: newest.rates,
      timestamp: newest.timestamp,
      sources: [newest.source],
      resolution: 'freshest-source'
    };
  }

  // Timestamps are within 1 hour - average the rates
  console.log('Timestamps within 1 hour - averaging rates from all sources');
  const averagedRates = averageRates(sources);

  return {
    rates: averagedRates,
    timestamp: newest.timestamp, // Use the newest timestamp
    sources: sources.map(s => s.source),
    resolution: 'averaged'
  };
}

/**
 * Calculate average rates across multiple sources
 * @param {Object[]} sources - Array of source results
 * @returns {Object} Averaged rates
 */
export function averageRates(sources) {
  const currencyTotals = {};
  const currencyCounts = {};

  // Sum up all rates for each currency
  for (const source of sources) {
    for (const [currency, rate] of Object.entries(source.rates)) {
      if (!currencyTotals[currency]) {
        currencyTotals[currency] = 0;
        currencyCounts[currency] = 0;
      }
      currencyTotals[currency] += rate;
      currencyCounts[currency]++;
    }
  }

  // Calculate averages
  const averaged = {};
  for (const currency of Object.keys(currencyTotals)) {
    averaged[currency] = currencyTotals[currency] / currencyCounts[currency];
    // Round to 6 decimal places for precision
    averaged[currency] = Math.round(averaged[currency] * 1000000) / 1000000;
  }

  return averaged;
}

/**
 * Get resolution statistics
 * @param {Object[]} sources - Array of source results
 * @returns {Object} Statistics about the sources
 */
export function getSourceStats(sources) {
  if (!sources || sources.length === 0) {
    return { count: 0, sources: [], timestamps: [] };
  }

  return {
    count: sources.length,
    sources: sources.map(s => s.source),
    timestamps: sources.map(s => ({
      source: s.source,
      timestamp: s.timestamp,
      age: Date.now() - s.timestamp
    }))
  };
}
