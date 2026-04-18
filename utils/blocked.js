// blocked.js — Block/unblock place management

import { STORAGE_KEYS } from '../constants/storage';

import { normalize, safeStore } from './helpers';

/**
 * Block a place and remove it from favorites if present.
 * @param {object} place - Place object with place_id and name
 * @param {object} opts - Options bag
 * @param {Array} opts.currentBlocked - Current blocked list
 * @param {Function} opts.setBlocked - Blocked state setter
 * @param {Array} opts.currentFavorites - Current favorites list
 * @param {Function} opts.setFavs - Favorites state setter
 * @param {boolean} [opts.byName] - Block by name instead of ID
 */
export function blockPlace(
  place,
  { currentBlocked, setBlocked, currentFavorites, setFavs, byName },
) {
  if (!byName && currentBlocked.some((b) => b.place_id === place.place_id)) return;
  const entry = {
    place_id: place.place_id,
    name: place.name,
    blockedAt: Date.now(),
    byName: byName || false,
  };
  const updated = [entry, ...currentBlocked];
  setBlocked(updated);
  safeStore(STORAGE_KEYS.BLOCKED, updated);
  // Also remove matching favorites
  const matchFav = byName
    ? (f) => normalize(f.name) === normalize(place.name)
    : (f) => f.place_id === place.place_id;
  if (currentFavorites?.some(matchFav)) {
    const updatedFavs = currentFavorites.filter((f) => !matchFav(f));
    setFavs(updatedFavs);
    safeStore(STORAGE_KEYS.FAVORITES, updatedFavs);
  }
}

/**
 * Check if a place is in the blocked list (by ID or name).
 * @param {string} placeId - Place ID to check
 * @param {string} name - Place name to check
 * @param {Array} blockedList - Current blocked entries
 * @returns {boolean}
 */
export function isBlocked(placeId, name, blockedList) {
  return blockedList.some(
    (b) => b.place_id === placeId || (b.byName && normalize(b.name) === normalize(name)),
  );
}

/**
 * Remove a place from the blocked list.
 * @param {string} placeId - Place ID to unblock
 * @param {Array} currentBlocked - Current blocked list
 * @param {Function} setBlocked - Blocked state setter
 */
export function unblockPlace(placeId, currentBlocked, setBlocked) {
  const updated = currentBlocked.filter((b) => b.place_id !== placeId);
  setBlocked(updated);
  safeStore(STORAGE_KEYS.BLOCKED, updated);
}
