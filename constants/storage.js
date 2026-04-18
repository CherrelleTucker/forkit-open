// ForkIt — AsyncStorage key constants

/**
 * AsyncStorage key constants.
 * @property {string} SAVED_LOCATIONS @deprecated Migrated to CUSTOM_PLACES
 */
export const STORAGE_KEYS = {
  FAVORITES: '@forkit_favorites',
  BLOCKED: '@forkit_blocked',
  CUSTOM_PLACES: '@forkit_custom_places',
  TRAVEL_MODE: '@forkit_travel_mode',
  API_FETCH_COUNT: '@forkit_api_fetches',
  SAVED_LOCATIONS: '@forkit_saved_locations', // DEPRECATED — migrated to customPlaces
  FORK_USAGE: '@forkit_fork_usage',
  TOUR_VERSION: '@forkit_tour_version',
  GROUP_SESSION: '@forkit_group_session',
  LAST_LOCATION: '@forkit_last_location',
  REVIEW_PROMPTED: '@forkit_review_prompted_v1',
  HISTORY: '@forkit_history',
};
