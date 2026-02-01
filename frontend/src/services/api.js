/**
 * API service for fetching exchange rates from backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Fetch exchange rates from backend
 * @returns {Promise<Object>} Rates data with status
 */
export async function fetchRates() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rates`);

    if (!response.ok) {
      if (response.status === 503) {
        const data = await response.json();
        return data;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch rates:', error);
    throw error;
  }
}

/**
 * Fetch backend health status
 * @returns {Promise<Object>} Health data
 */
export async function fetchHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch health:', error);
    throw error;
  }
}

/**
 * Fetch supported currencies
 * @returns {Promise<Object>} Currencies data
 */
export async function fetchCurrencies() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/currencies`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch currencies:', error);
    throw error;
  }
}

/**
 * Format timestamp to readable date/time
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date string
 */
export function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format age in milliseconds to human-readable string
 * @param {number} ageMs - Age in milliseconds
 * @returns {string} Human-readable age
 */
export function formatAge(ageMs) {
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ago`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s ago`;
  } else {
    return `${seconds}s ago`;
  }
}
