// useFilters — Search filter state, custom location search, travel mode persistence.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  DEBOUNCE_DELAY,
  MILES_TO_METERS,
  RADIUS_CLAMP_MIN,
  RADIUS_CLAMP_MAX,
  TOAST_SHORT,
  TOAST_DEFAULT,
  WALK_RADIUS_MAX,
  WALK_RADIUS_DEFAULT,
  DRIVE_RADIUS_MIN,
  DRIVE_RADIUS_DEFAULT,
} from '../constants/config';
import { STORAGE_KEYS } from '../constants/storage';
import { fetchAddressSuggestions, getPlaceDetails } from '../utils/api';
import { clamp } from '../utils/helpers';

/**
 * Hook that manages all search filter state and custom location search.
 * @param {object} params
 * @param {{ latitude: number, longitude: number }|null} params.coords - Current GPS coordinates (for biasing suggestions)
 * @param {(text: string, kind: string, ms?: number) => void} params.showToast
 * @param {boolean} params.isPro - Whether user has Pro or Pro+ subscription
 * @returns {object} All filter state, setters, and location search functions
 */
// eslint-disable-next-line max-lines-per-function -- filter state + location search + session token management
export default function useFilters({ coords, showToast, isPro }) {
  // Core filters
  const [travelMode, setTravelMode] = useState('drive');
  const [forkMode, setForkMode] = useState('solo');
  const [radiusMiles, setRadiusMiles] = useState(3);
  const [openNow, setOpenNow] = useState(isPro);
  const [maxPrice, setMaxPrice] = useState(isPro ? 2 : 4);
  const [minRating, setMinRating] = useState(isPro ? 4.0 : 0);
  const [cuisineKeyword, setCuisineKeyword] = useState('');
  const [excludeKeyword, setExcludeKeyword] = useState('');
  const [hiddenGems, setHiddenGems] = useState(true);

  // Custom search location (null = GPS mode)
  const [customLocation, setCustomLocation] = useState(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSearch, setShowLocationSearch] = useState(false);

  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const locationDebounceRef = useRef(null);
  const sessionTokenRef = useRef(null);

  const radiusMeters = useMemo(
    () => Math.round(clamp(radiusMiles, RADIUS_CLAMP_MIN, RADIUS_CLAMP_MAX) * MILES_TO_METERS),
    [radiusMiles],
  );

  // Cleanup debounce timer on unmount
  useEffect(
    () => () => {
      if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    },
    [],
  );

  function handleLocationQueryChange(text) {
    setLocationQuery(text);
    setLocationSuggestions([]);
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    if (text.trim().length >= 3) {
      locationDebounceRef.current = setTimeout(async () => {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = Crypto.randomUUID();
        }
        const { suggestions } = await fetchAddressSuggestions(
          text,
          coords,
          sessionTokenRef.current,
        );
        setLocationSuggestions(suggestions);
      }, DEBOUNCE_DELAY);
    }
  }

  async function selectCustomLocation(suggestion) {
    setLocationQuery(suggestion.description);
    setLocationSuggestions([]);
    sessionTokenRef.current = null;
    const details = await getPlaceDetails(suggestion.placeId);
    if (details?.geometry?.location) {
      setCustomLocation({
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        label: suggestion.mainText || suggestion.description,
      });
      showToast(`Searching near ${suggestion.mainText}`, 'success', TOAST_SHORT);
    } else {
      showToast('Could not get location. Try another address.', 'warn', TOAST_DEFAULT);
      setLocationQuery('');
    }
  }

  function clearCustomLocation() {
    setCustomLocation(null);
    setLocationQuery('');
    setLocationSuggestions([]);
    setShowLocationSearch(false);
    sessionTokenRef.current = null;
    showToast('Switched back to your GPS location', 'info', TOAST_SHORT);
  }

  function persistTravelMode(mode) {
    setTravelMode(mode);
    AsyncStorage.setItem(STORAGE_KEYS.TRAVEL_MODE, mode).catch(() => {});
    if (mode === 'walk' && radiusMiles > WALK_RADIUS_MAX) setRadiusMiles(WALK_RADIUS_DEFAULT);
    if (mode === 'drive' && radiusMiles < DRIVE_RADIUS_MIN) setRadiusMiles(DRIVE_RADIUS_DEFAULT);
  }

  return {
    travelMode,
    setTravelMode,
    forkMode,
    setForkMode,
    radiusMiles,
    setRadiusMiles,
    radiusMeters,
    openNow,
    setOpenNow,
    maxPrice,
    setMaxPrice,
    minRating,
    setMinRating,
    cuisineKeyword,
    setCuisineKeyword,
    excludeKeyword,
    setExcludeKeyword,
    hiddenGems,
    setHiddenGems,
    filtersExpanded,
    setFiltersExpanded,
    customLocation,
    showLocationSearch,
    setShowLocationSearch,
    locationQuery,
    locationSuggestions,
    handleLocationQueryChange,
    selectCustomLocation,
    clearCustomLocation,
    persistTravelMode,
  };
}
