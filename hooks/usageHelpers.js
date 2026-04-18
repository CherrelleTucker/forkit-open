// Pure helper functions extracted from useUsage for testability.

import {
  FREE_SOLO_FORKS,
  FREE_GROUP_FORKS,
  PRO_SOLO_FORKS,
  PRO_GROUP_FORKS,
  IAP_SKUS_IOS,
  IAP_SKUS_ANDROID,
} from '../constants/config';

/**
 * Check whether the stored usage belongs to a different month than now.
 * @param {{month: number, year: number}} usage
 * @param {Date} [now] - optional, defaults to new Date()
 * @returns {boolean}
 */
// CRITICAL — Revenue Gate: detects month boundary crossing. Called before every quota
// check. If this returns wrong result, users either never reset (stuck at 0 forever)
// or reset constantly (infinite free tier).
export function shouldResetUsage(usage, now = new Date()) {
  return usage.month !== now.getMonth() || usage.year !== now.getFullYear();
}

/**
 * Build a zeroed-out usage object for the current month.
 * @param {Date} [now]
 * @returns {{solo: number, group: number, month: number, year: number}}
 */
export function buildResetUsage(now = new Date()) {
  return { solo: 0, group: 0, month: now.getMonth(), year: now.getFullYear() };
}

/**
 * Check if usage has exceeded the quota for the user's tier.
 * @param {'solo' | 'group'} type
 * @param {{solo: number, group: number}} usage
 * @param {boolean} isPro
 * @param {boolean} isProPlus
 * @returns {boolean} true if quota is exceeded (should show paywall)
 */
// CRITICAL — Revenue Gate: enforces tier limits (Free 10/1, Pro 20/3, Pro+ unlimited).
// If this returns wrong result, free users get unlimited searches or Pro users get capped.
export function isQuotaExceeded(type, usage, isPro, isProPlus) {
  if (isProPlus) return false;
  let limit;
  if (isPro) {
    limit = type === 'solo' ? PRO_SOLO_FORKS : PRO_GROUP_FORKS;
  } else {
    limit = type === 'solo' ? FREE_SOLO_FORKS : FREE_GROUP_FORKS;
  }
  const count = type === 'solo' ? usage.solo : usage.group;
  return count >= limit;
}

/**
 * Calculate annual savings percentage vs monthly pricing.
 * @param {number} monthlyPrice - monthly price in currency units
 * @param {number} annualPrice - annual price in currency units
 * @returns {number|null} savings percentage (0-100) or null if not calculable
 */
export function calcAnnualSavings(monthlyPrice, annualPrice) {
  const MONTHS_PER_YEAR = 12;
  if (!annualPrice || !monthlyPrice || monthlyPrice <= 0) return null;
  return Math.round((1 - annualPrice / (monthlyPrice * MONTHS_PER_YEAR)) * 100);
}

/**
 * Determine the subscription tier from a product ID.
 * @param {string} productId - the store product ID
 * @returns {'pro_plus' | 'pro' | null}
 */
export function tierFromProductId(productId) {
  // Check iOS IDs
  if (productId === IAP_SKUS_IOS.PRO_PLUS_MONTHLY || productId === IAP_SKUS_IOS.PRO_PLUS_ANNUAL) {
    return 'pro_plus';
  }
  if (productId === IAP_SKUS_IOS.PRO_MONTHLY || productId === IAP_SKUS_IOS.PRO_ANNUAL) {
    return 'pro';
  }
  // Check Android IDs
  if (productId === IAP_SKUS_ANDROID.PRO_PLUS) return 'pro_plus';
  if (productId === IAP_SKUS_ANDROID.PRO) return 'pro';
  return null;
}

/**
 * Build an incremented usage object.
 * @param {{solo: number, group: number, month: number, year: number}} current
 * @param {'solo' | 'group'} type
 * @param {Date} [now]
 * @returns {{solo: number, group: number, month: number, year: number}}
 */
export function buildIncrementedUsage(current, type, now = new Date()) {
  const updated = { ...current, month: now.getMonth(), year: now.getFullYear() };
  updated[type === 'solo' ? 'solo' : 'group'] += 1;
  return updated;
}
