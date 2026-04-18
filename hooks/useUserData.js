// useUserData — Favorites, blocked, custom places, and storage persistence.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { WALK_RADIUS_MAX, WALK_RADIUS_DEFAULT } from '../constants/config';
import { STORAGE_KEYS } from '../constants/storage';
import { safeStore } from '../utils/helpers';
import { parseStoredState } from '../utils/storageParser';

/**
 * Hook that manages user data (favorites, blocked, custom places).
 * All data lives in AsyncStorage only.
 * @param {object} params
 * @param {(mode: string) => void} params.setTravelMode - Setter from useFilters
 * @param {(miles: number) => void} params.setRadiusMiles - Setter from useFilters
 * @param {{ current: number }} params.apiFetchCountRef - Ref from App.js
 * @returns {object} User data state, setters, and clearAllUserData
 */
export default function useUserData({ setTravelMode, setRadiusMiles, apiFetchCountRef }) {
  const [favorites, setFavorites] = useState([]);
  const [blockedIds, setBlockedIds] = useState([]);
  const [customPlaces, setCustomPlaces] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showCustomPlaces, setShowCustomPlaces] = useState(false);

  // Load persisted state on mount (favorites, blocked, custom places, travel mode, fetch count)
  useEffect(() => {
    (async () => {
      try {
        const raw = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
          AsyncStorage.getItem(STORAGE_KEYS.BLOCKED),
          AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_PLACES),
          AsyncStorage.getItem(STORAGE_KEYS.TRAVEL_MODE),
          AsyncStorage.getItem(STORAGE_KEYS.API_FETCH_COUNT),
          AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS),
        ]);
        const s = parseStoredState(raw);
        if (s.favorites) {
          setFavorites(s.favorites);
          safeStore(STORAGE_KEYS.FAVORITES, s.favorites);
        }
        if (s.blockedIds) setBlockedIds(s.blockedIds);
        if (s.customPlaces) setCustomPlaces(s.customPlaces);
        if (s.travelMode) {
          setTravelMode(s.travelMode);
          if (s.travelMode === 'walk') {
            setRadiusMiles((prev) => (prev > WALK_RADIUS_MAX ? WALK_RADIUS_DEFAULT : prev));
          }
        }
        if (s.fetchCount) apiFetchCountRef.current = s.fetchCount;
        // Clean up deprecated savedLocations storage
        AsyncStorage.removeItem(STORAGE_KEYS.SAVED_LOCATIONS).catch(() => {});
      } catch (_) {
        // Storage read failures are non-critical — app works with defaults
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function reloadFromStorage() {
    try {
      const [rawFavs, rawBlocked, rawCustom] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
        AsyncStorage.getItem(STORAGE_KEYS.BLOCKED),
        AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_PLACES),
      ]);
      if (rawFavs) setFavorites(JSON.parse(rawFavs));
      if (rawBlocked) setBlockedIds(JSON.parse(rawBlocked));
      if (rawCustom) setCustomPlaces(JSON.parse(rawCustom));
    } catch (_) {
      // Non-critical
    }
  }

  function clearAllUserData() {
    setFavorites([]);
    setBlockedIds([]);
    setCustomPlaces([]);
    AsyncStorage.multiRemove([
      STORAGE_KEYS.FAVORITES,
      STORAGE_KEYS.BLOCKED,
      STORAGE_KEYS.CUSTOM_PLACES,
      STORAGE_KEYS.GROUP_SESSION,
    ]).catch(() => {});
  }

  return {
    favorites,
    setFavorites,
    blockedIds,
    setBlockedIds,
    customPlaces,
    setCustomPlaces,
    showFavorites,
    setShowFavorites,
    showBlocked,
    setShowBlocked,
    showCustomPlaces,
    setShowCustomPlaces,
    clearAllUserData,
    reloadFromStorage,
  };
}
