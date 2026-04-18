// api.js — Backend API calls

import {
  APP_VERSION,
  BACKEND_URL,
  DETAILS_TIMEOUT,
  HTTP_TOO_MANY_REQUESTS,
} from '../constants/config';

/**
 * Common headers for all backend requests — includes app version for API versioning.
 * Spread into your fetch headers: { ...backendHeaders(), 'Content-Type': 'application/json' }
 * @returns {object} Headers object with X-App-Version
 */
export function backendHeaders() {
  const headers = { 'X-App-Version': APP_VERSION };
  if (typeof __DEV__ !== 'undefined' && __DEV__) headers['X-Source'] = 'dev';
  return headers;
}

/**
 * Compare two semver strings.
 * @param {string} a - First version
 * @param {string} b - Second version
 * @returns {number} -1 if a < b, 0 if equal, 1 if a > b
 */
function compareSemver(a, b) {
  const [aMajor = 0, aMinor = 0, aPatch = 0] = a.split('.').map(Number);
  const [bMajor = 0, bMinor = 0, bPatch = 0] = b.split('.').map(Number);
  if (aMajor !== bMajor) return aMajor < bMajor ? -1 : 1;
  if (aMinor !== bMinor) return aMinor < bMinor ? -1 : 1;
  if (aPatch !== bPatch) return aPatch < bPatch ? -1 : 1;
  return 0;
}

const VERSION_CHECK_TIMEOUT = 5000;

/**
 * Check if the app version meets the server's minimum requirement.
 * Calls GET /api/health?action=config and returns { updateRequired, latestVersion }.
 * Returns { updateRequired: false } on any error (fail open).
 * @returns {Promise<{updateRequired: boolean, latestVersion?: string}>}
 */
export async function checkAppVersion() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VERSION_CHECK_TIMEOUT);
    const response = await fetch(`${BACKEND_URL}/api/health?action=config`, {
      headers: backendHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return { updateRequired: false };
    const { minVersion, latestVersion } = await response.json();
    if (!minVersion) return { updateRequired: false };
    return {
      updateRequired: compareSemver(APP_VERSION, minVersion) < 0,
      latestVersion: latestVersion || minVersion,
    };
  } catch {
    return { updateRequired: false };
  }
}

/**
 * Fetch address autocomplete suggestions from the backend.
 * @param {string} input - Search query text
 * @param {{latitude: number, longitude: number}|null} coords - User's current location for bias
 * @param {string} [sessionToken] - UUID session token for session-based billing ($0)
 * @returns {Promise<{suggestions: Array, error: string|null}>} Suggestions and optional error
 */
export async function fetchAddressSuggestions(input, coords, sessionToken) {
  if (!input || input.trim().length < 3) return { suggestions: [], error: null };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DETAILS_TIMEOUT);
  try {
    const body = { input: input.trim() };
    if (coords?.latitude && coords?.longitude) {
      body.latitude = coords.latitude;
      body.longitude = coords.longitude;
    }
    if (sessionToken) body.sessionToken = sessionToken;
    const response = await fetch(`${BACKEND_URL}/api/places-autocomplete`, {
      method: 'POST',
      headers: { ...backendHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.status === HTTP_TOO_MANY_REQUESTS) return { suggestions: [], error: 'rate_limit' };
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { suggestions: [], error: data.error || `Server error (${response.status})` };
    }
    const data = await response.json();
    return { suggestions: data.suggestions || [], error: null };
  } catch (err) {
    clearTimeout(timeoutId);
    const message = err.name === 'AbortError' ? 'Request timed out' : 'Network error';
    return { suggestions: [], error: message };
  }
}

/**
 * Fetch detailed info for a place by ID.
 * @param {string} placeId - Google Places place_id
 * @returns {Promise<object|null>} Place details or null on failure
 */
export async function getPlaceDetails(placeId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DETAILS_TIMEOUT);
  try {
    const response = await fetch(`${BACKEND_URL}/api/places`, {
      method: 'POST',
      headers: { ...backendHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'details', placeId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== 'OK') return null;
    return data.result;
  } catch (_) {
    clearTimeout(timeoutId);
    return null;
  }
}
