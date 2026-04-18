// ForkIt - App Integrity Helper
// Android: Google Play Integrity API
// iOS: App Attest (future — returns null for now)

import { Platform } from 'react-native';

// Only import AppIntegrity on Android (iOS App Attest not yet implemented)
let AppIntegrity = null;
if (Platform.OS === 'android') {
  try {
    const mod = require('@expo/app-integrity');
    if (mod && typeof mod.requestIntegrityToken === 'function') {
      AppIntegrity = mod;
    }
  } catch (_) {
    // expo-app-integrity not available in this build
  }
}

// Cache the integrity token for the session
let cachedToken = null;
let tokenTimestamp = null;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const TOKEN_CACHE_DURATION = MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

/**
 * Get an integrity token for the current app session.
 * Android: Play Integrity API
 * iOS/web: returns null (iOS App Attest planned for future release)
 * @returns {Promise<string|null>} The integrity token or null
 */
export async function getIntegrityToken() {
  try {
    if (Platform.OS !== 'android' || !AppIntegrity) {
      return null;
    }

    // Return cached token if still valid
    if (cachedToken && tokenTimestamp) {
      const age = Date.now() - tokenTimestamp;
      if (age < TOKEN_CACHE_DURATION) {
        return cachedToken;
      }
    }

    const nonce = generateNonce();
    const token = await AppIntegrity.requestIntegrityToken(nonce);

    if (token) {
      cachedToken = token;
      tokenTimestamp = Date.now();
      return token;
    }
    return null;
  } catch (error) {
    // Don't block the user if integrity check fails
    return null;
  }
}

/**
 * Verify an integrity token with the backend.
 * @param {string} token - The integrity token to verify
 * @param {string} backendUrl - The backend API base URL
 * @returns {Promise<{verified: boolean, error?: string}>} Verification result
 */
export async function verifyIntegrityToken(token, backendUrl) {
  const controller = new AbortController();
  const VERIFY_TIMEOUT = 8000;
  const timeoutId = setTimeout(() => controller.abort(), VERIFY_TIMEOUT);
  try {
    if (!token) {
      clearTimeout(timeoutId);
      return { verified: false, error: 'No token provided' };
    }

    const response = await fetch(`${backendUrl}/api/verify-integrity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { verified: false, error: 'Verification request failed' };
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    return { verified: false, error: error.message };
  }
}

/** Generate a cryptographically random nonce for integrity token requests.
 * @returns {string} A unique nonce string
 */
function generateNonce() {
  const timestamp = Date.now().toString();
  const NONCE_BYTES = 16;
  const bytes = new Uint8Array(NONCE_BYTES);
  // eslint-disable-next-line no-undef -- globalThis.crypto is available in RN Hermes
  globalThis.crypto.getRandomValues(bytes);
  const random = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''); // eslint-disable-line no-magic-numbers -- hex encoding
  return `${timestamp}-${random}`;
}
