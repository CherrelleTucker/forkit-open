// favorites.js — Favorite toggling and updating

import { STORAGE_KEYS } from '../constants/storage';

import { safeStore } from './helpers';

/**
 * Add or remove a place from favorites.
 * @param {object} place - Place object with place_id, name, vicinity, rating, price_level
 * @param {Array} currentFavorites - Current favorites list
 * @param {Function} setFavs - Favorites state setter
 * @returns {boolean} True if place was added, false if removed
 */
export function toggleFavorite(place, currentFavorites, setFavs) {
  const exists = currentFavorites.some((f) => f.place_id === place.place_id);
  let updated;
  if (exists) {
    updated = currentFavorites.filter((f) => f.place_id !== place.place_id);
  } else {
    const now = Date.now();
    updated = [
      {
        place_id: place.place_id,
        name: place.name,
        vicinity: place.vicinity || '',
        rating: place.rating || null,
        price_level: place.price_level || null,
        savedAt: now,
        userNotes: '',
        userDishes: '',
        userRating: null,
        visitCount: 0,
        lastVisitedAt: null,
        updatedAt: now,
        schemaVersion: 2,
      },
      ...currentFavorites,
    ];
  }
  setFavs(updated);
  safeStore(STORAGE_KEYS.FAVORITES, updated);
  return !exists;
}

/**
 * Update fields on an existing favorite entry.
 * @param {string} placeId - Place ID of the favorite to update
 * @param {object} changes - Fields to merge into the favorite
 * @param {Array} currentFavorites - Current favorites list
 * @param {Function} setFavs - Favorites state setter
 */
export function updateFavorite(placeId, changes, currentFavorites, setFavs) {
  const updated = currentFavorites.map((fav) => {
    if (fav.place_id !== placeId) return fav;
    return { ...fav, ...changes, updatedAt: Date.now() };
  });
  setFavs(updated);
  safeStore(STORAGE_KEYS.FAVORITES, updated);
}
