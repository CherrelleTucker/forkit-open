// customPlaces.js — Add and remove custom (user-created) places

import { STORAGE_KEYS } from '../constants/storage';

import { normalize, safeStore } from './helpers';

/**
 * Check for duplicate name or address among a list of custom places.
 * @param {string} name - Place name to check
 * @param {string} address - Place address to check
 * @param {Array} places - Custom places to check against
 * @returns {{reason?: string, dupe?: string, dupeAddr?: string}|null} Match info or null
 */
export function findDupe(name, address, places) {
  const normalName = normalize(name);
  const normalAddr = normalize(address);
  const nameMatch = places.find((cp) => normalize(cp.name) === normalName);
  if (nameMatch) return { reason: 'name', dupe: nameMatch.name, dupeAddr: nameMatch.vicinity };
  if (normalAddr) {
    const addrMatch = places.find((cp) => cp.vicinity && normalize(cp.vicinity) === normalAddr);
    if (addrMatch) return { reason: 'address', dupe: addrMatch.name };
  }
  return null;
}

/**
 * Format a user-facing duplicate message from a findDupe result.
 * @param {{reason: string, dupe: string, dupeAddr?: string}} match
 * @returns {string}
 */
export function dupeMessage(match) {
  if (match.reason === 'address') {
    return `Not saved: address is already in your spots under "${match.dupe}".`;
  }
  const suffix = match.dupeAddr ? ` at ${match.dupeAddr}` : '';
  return `Not saved: "${match.dupe}" is already in your spots${suffix}.`;
}

/**
 * Add a user-created custom place, checking for duplicates by name and address.
 * @param {string} name - Place name
 * @param {string} address - Place address
 * @param {object} opts - Options bag
 * @param {string} [opts.notes] - User notes
 * @param {string} [opts.tags] - Comma-separated tags
 * @param {Array} opts.currentCustom - Current custom places list
 * @param {Function} opts.setCustom - Custom places state setter
 * @returns {{ok: boolean, reason?: string, dupe?: string, dupeAddr?: string}}
 */
export function addCustomPlace(name, address, opts) {
  const { notes, tags, lat, lng, currentCustom, setCustom } = opts;
  const trimmed = name.trim();
  if (!trimmed) return { ok: false };
  const match = findDupe(trimmed, address.trim(), currentCustom);
  if (match) return { ok: false, ...match };
  const newPlace = {
    place_id: `custom_${Date.now()}`,
    name: trimmed,
    vicinity: address.trim() || '',
    notes: notes?.trim() || '',
    tags: tags?.trim() || '',
    lat: lat ?? null,
    lng: lng ?? null,
    isCustom: true,
    rating: null,
    price_level: null,
    user_ratings_total: 0,
    createdAt: Date.now(),
  };
  const updated = [newPlace, ...currentCustom];
  setCustom(updated);
  safeStore(STORAGE_KEYS.CUSTOM_PLACES, updated);
  return { ok: true };
}

/**
 * Remove a custom place by ID.
 * @param {string} placeId - Place ID to remove
 * @param {Array} currentCustom - Current custom places list
 * @param {Function} setCustom - Custom places state setter
 */
export function removeCustomPlace(placeId, currentCustom, setCustom) {
  const updated = currentCustom.filter((p) => p.place_id !== placeId);
  setCustom(updated);
  safeStore(STORAGE_KEYS.CUSTOM_PLACES, updated);
}
