// helpers.js — Pure utility functions used across the app

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Linking } from 'react-native';

import {
  CLOSING_SOON_WARN_MIN,
  DAYS_PER_WEEK,
  HIDDEN_GEMS_MAX_REVIEWS,
  MINUTES_PER_DAY,
  MINUTES_PER_HOUR,
  OVERNIGHT_CUTOFF_MIN,
  REVIEW_FORK_THRESHOLD,
  REVIEW_REQUEST_DELAY,
  WALK_CLOSE_RADIUS,
} from '../constants/config';
import { CHAIN_KEYWORDS, SIGNATURE_DISH_RULES } from '../constants/content';
import { STORAGE_KEYS } from '../constants/storage';

import { showAlert } from './platform';

/**
 * Persist data to AsyncStorage, silently ignoring errors.
 * @param {string} key - Storage key
 * @param {*} data - Value to JSON-serialize and store
 */
export function safeStore(key, data) {
  AsyncStorage.setItem(key, JSON.stringify(data)).catch((e) => {
    if (__DEV__) console.warn('safeStore failed:', key, e);
  });
}

/**
 * Clamp a number between min and max.
 * @param {number} n - Value to clamp
 * @param {number} min - Lower bound
 * @param {number} max - Upper bound
 * @returns {number}
 */
export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Lowercase and trim a string, returning '' for falsy input.
 * @param {string} s - Input string
 * @returns {string}
 */
export function normalize(s) {
  return (s || '').toLowerCase().trim();
}

/**
 * Calculate the distance in miles between two coordinates using the Haversine formula.
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in miles
 */
export function haversineDistanceMiles(lat1, lng1, lat2, lng2) {
  const EARTH_RADIUS_MILES = 3959;
  const toRad = (deg) => (deg * Math.PI) / 180; // eslint-disable-line no-magic-numbers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Pick a random element from an array.
 * @param {Array} arr - Source array
 * @returns {*} Random element, or null if array is empty/falsy
 */
export function pickRandom(arr) {
  if (!arr?.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Convert a numeric price level to a dollar-sign string.
 * @param {number|null} priceLevel - Google Places price level (1-4)
 * @returns {string} Dollar signs or 'Price —' if unavailable
 */
export function dollars(priceLevel) {
  if (!priceLevel || priceLevel < 1) return 'Price —';
  return '$'.repeat(priceLevel);
}

/**
 * Promise-based delay.
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Detect whether a restaurant is likely a chain.
 * @param {string} name - Restaurant name
 * @param {number} [userRatingsTotal] - Total Google review count
 * @returns {boolean}
 */
export function looksLikeChain(name, userRatingsTotal) {
  const n = normalize(name);
  const nameMatch = CHAIN_KEYWORDS.some((k) => n.includes(k));
  const highReviewCount = (userRatingsTotal || 0) >= HIDDEN_GEMS_MAX_REVIEWS;
  return nameMatch && highReviewCount;
}

/**
 * Name-only chain check for Basic-field search results (no userRatingCount available).
 * Used at pool time when search returns Basic fields only. Full check (with review count)
 * happens at detail time via looksLikeChain().
 * @param {string} name - Restaurant name
 * @returns {boolean}
 */
export function looksLikeChainByName(name) {
  return CHAIN_KEYWORDS.some((k) => normalize(name).includes(k));
}

/**
 * Look up a restaurant's signature dish from content rules.
 * @param {string} restaurantName - Restaurant name to match
 * @returns {string} Matched dish name or 'Signature dish'
 */
export function getSignatureDish(restaurantName) {
  const n = normalize(restaurantName);
  for (const rule of SIGNATURE_DISH_RULES) {
    if (rule.match.some((m) => n.includes(normalize(m)))) return rule.dish;
  }
  return 'Signature dish';
}

/**
 * Build copycat recipe search links for YouTube, Google, and Allrecipes.
 * @param {string} restaurantName - Restaurant name
 * @param {string} [dishName] - Dish name (falls back to restaurant name)
 * @returns {Array<{label: string, icon: string, url: string}>}
 */
export function buildRecipeLinks(restaurantName, dishName) {
  // If dishName is empty (unknown signature dish), just search restaurant name
  const searchTerm = dishName ? `${restaurantName} ${dishName}` : restaurantName;
  const q = encodeURIComponent(`${searchTerm} copycat recipe`);
  const qDish = encodeURIComponent(`${dishName || restaurantName} copycat recipe`);
  return [
    {
      label: 'YouTube',
      icon: 'logo-youtube',
      url: `https://www.youtube.com/results?search_query=${q}`,
    },
    { label: 'Google', icon: 'search', url: `https://www.google.com/search?q=${q}` },
    { label: 'Allrecipes', icon: 'book', url: `https://www.allrecipes.com/search?q=${qDish}` },
  ];
}

/**
 * Check if a restaurant matches any exclude filter terms.
 * @param {object} restaurant - Place object with name and types
 * @param {string[]} excludeTerms - Lowercased terms to exclude
 * @returns {boolean}
 */
export function matchesExclude(restaurant, excludeTerms) {
  if (excludeTerms.length === 0) return false;
  const nameLower = (restaurant.name || '').toLowerCase();
  const typesJoined = (restaurant.types || []).join(' ').toLowerCase();
  return excludeTerms.some((term) => nameLower.includes(term) || typesJoined.includes(term));
}

/**
 * Calculate minutes remaining until a place closes today.
 * Note: Google Places `periods` use the restaurant's local timezone,
 * while `new Date()` uses the device's timezone. When these differ
 * (e.g., searching a different timezone via custom location), the result
 * may be inaccurate. We treat this as a best-effort "closing soon" hint
 * rather than an authoritative source, so the worst case is a missing
 * or unnecessary toast — never blocking a valid result.
 * @param {object|null} openingHours - Google Places opening_hours with periods
 * @returns {number|null} Minutes until closing, or null if unknown
 */
export function getMinutesUntilClosing(openingHours) {
  if (!openingHours?.periods?.length) return null;
  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * MINUTES_PER_HOUR + now.getMinutes();

  for (const period of openingHours.periods) {
    if (!period.close || period.close.day !== currentDay) continue;
    const closeMinutes = period.close.hour * MINUTES_PER_HOUR + period.close.minute;
    if (closeMinutes > currentMinutes) return closeMinutes - currentMinutes;
  }

  const tomorrow = (currentDay + 1) % DAYS_PER_WEEK;
  for (const period of openingHours.periods) {
    if (!period.close || period.close.day !== tomorrow) continue;
    const closeMinutes = period.close.hour * MINUTES_PER_HOUR + period.close.minute;
    if (closeMinutes < OVERNIGHT_CUTOFF_MIN) {
      return MINUTES_PER_DAY - currentMinutes + closeMinutes;
    }
  }

  return null;
}

/**
 * Get a closing-soon toast message based on travel mode and distance.
 * @param {number|null} closingMins - Minutes until closing
 * @param {string} travelMode - 'walk' or 'drive'
 * @param {number} radiusMiles - Search radius in miles
 * @returns {string|null} Toast message or null if not closing soon
 */
export function getClosingSoonToast(closingMins, travelMode, radiusMiles) {
  if (closingMins === null || closingMins > CLOSING_SOON_WARN_MIN) return null;
  if (travelMode === 'walk' && radiusMiles <= WALK_CLOSE_RADIUS) return 'Get walking!';
  if (travelMode === 'walk') return 'Better hurry!';
  return 'Drive safely!';
}

/**
 * Open Google Maps search for a place name.
 * @param {string} name - Place name to search
 */
export function openMapsSearchByText(name) {
  const q = encodeURIComponent(name);
  const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
  Linking.openURL(url).catch(() => showAlert('Error', 'Could not open maps.'));
}

/**
 * Initiate a phone call via the system dialer.
 * @param {string} phoneNumber - Phone number to call
 */
export function callPhone(phoneNumber) {
  if (!phoneNumber) return;
  Linking.openURL(`tel:${phoneNumber}`).catch(() => showAlert('Error', 'Could not start a call.'));
}

/**
 * Prompt the user to rate the app after reaching the fork threshold.
 * Only prompts once per install.
 * @param {number} totalForks - Total solo forks completed
 */
export async function maybePromptReview(totalForks) {
  if (totalForks < REVIEW_FORK_THRESHOLD) return;
  try {
    const prompted = await AsyncStorage.getItem(STORAGE_KEYS.REVIEW_PROMPTED);
    if (prompted) return;
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;
    // Small delay so user sees their fork result first
    setTimeout(() => StoreReview.requestReview(), REVIEW_REQUEST_DELAY);
    await AsyncStorage.setItem(STORAGE_KEYS.REVIEW_PROMPTED, 'true');
  } catch (_) {
    // Non-critical
  }
}
