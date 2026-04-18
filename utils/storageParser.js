// storageParser.js — Parse raw AsyncStorage data into typed state

/**
 * Migrate a favorite entry to the current schema (v2).
 * @param {object} fav - Favorite entry (possibly v1)
 * @returns {object} Migrated favorite with all v2 fields
 */
function migrateFavorite(fav) {
  if (fav.schemaVersion === 2) return fav;
  return {
    ...fav,
    userNotes: fav.userNotes || '',
    userDishes: fav.userDishes || '',
    userRating: fav.userRating ?? null,
    visitCount: fav.visitCount || 0,
    lastVisitedAt: fav.lastVisitedAt ?? null,
    updatedAt: fav.updatedAt || fav.savedAt || Date.now(),
    schemaVersion: 2,
  };
}

/**
 * Parse raw AsyncStorage values into typed state. Returns only fields that had data.
 * @param {Array} raw - array of [favData, blockData, customData, travelData, fetchCountData, _savedLocsData]
 * @returns {object} parsed state fields
 */
export function parseStoredState(raw) {
  const [favData, blockData, customData, travelData, fetchCountData] = raw;
  const state = {};
  if (favData) state.favorites = JSON.parse(favData).map(migrateFavorite);
  if (blockData) state.blockedIds = JSON.parse(blockData);
  if (customData) state.customPlaces = JSON.parse(customData);
  if (travelData === 'walk' || travelData === 'drive') state.travelMode = travelData;
  if (fetchCountData) state.fetchCount = parseInt(fetchCountData, 10) || 0;
  return state;
}
