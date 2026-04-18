/* eslint-disable max-lines -- fork engine hook consolidates related fork state and logic */
// useForkEngine — Core fork flow: pool caching, pick-then-verify, slot reveal, animations.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { useMemo, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

import {
  BACKEND_URL,
  TOAST_DEFAULT,
  TOAST_LONG,
  FETCH_TIMEOUT,
  THROTTLE_WINDOW,
  THROTTLE_MAX_TAPS,
  RECENTLY_SHOWN_MAX,
  POOL_STALE_MS,
  WALK_RESULTS_THRESHOLD,
  CLOSING_SOON_EXCLUDE_MIN,
  HTTP_TOO_MANY_REQUESTS,
  BOUNCE_OFFSET,
  THROTTLE_TOAST_MS,
  WALK_SUGGEST_DELAY,
  SLOT_BASE_DELAY,
  SLOT_INCREMENT,
  SLOT_MIN_CYCLES,
  SLOT_MAX_CYCLES,
  DRAMATIC_PAUSE,
  WALK_RADIUS_DEFAULT,
  FORK_COOLDOWN_MS,
  RATING_LOW,
} from '../constants/config';
import { FORKING_LINES, SUCCESS_LINES, FAIL_LINES } from '../constants/content';
import { STORAGE_KEYS } from '../constants/storage';
import { backendHeaders, getPlaceDetails } from '../utils/api';
import { isBlocked } from '../utils/blocked';
import {
  pickRandom,
  sleep,
  looksLikeChain,
  looksLikeChainByName,
  getSignatureDish,
  buildRecipeLinks,
  matchesExclude,
  getMinutesUntilClosing,
  getClosingSoonToast,
  haversineDistanceMiles,
  maybePromptReview,
} from '../utils/helpers';
import { getIntegrityToken } from '../utils/integrity';
import { haptics } from '../utils/platform';

const HISTORY_MAX_SOLO = 50;
const HISTORY_MAX_GROUP = 50;

/**
 * Save a fork result to local history in AsyncStorage.
 * Keeps the last 50 solo and 50 group entries.
 * @param {{name: string, address: string, type: 'solo'|'group', place_id?: string, session_code?: string}} entry
 */
async function saveToHistory(entry) {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
  let all = [];
  try {
    all = raw ? JSON.parse(raw) : [];
  } catch (_) {
    // Corrupted history — reset
  }
  const item = {
    // eslint-disable-next-line no-magic-numbers -- base-36 for alphanumeric ID
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...entry,
    forked_at: new Date().toISOString(),
  };
  all.unshift(item);
  // Keep last N per type
  const solo = all.filter((h) => h.type === 'solo').slice(0, HISTORY_MAX_SOLO);
  const group = all.filter((h) => h.type === 'group').slice(0, HISTORY_MAX_GROUP);
  await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([...solo, ...group]));
}

// Generic Google types to skip when determining a restaurant's cuisine category
const GENERIC_TYPES = [
  'restaurant',
  'food',
  'point_of_interest',
  'establishment',
  'store',
  'meal_delivery',
  'meal_takeaway',
];

/**
 * Get the most specific cuisine type for a restaurant.
 * @param {object} place - restaurant with a `types` array
 * @returns {string|null} specific type like 'pizza_restaurant' or null
 */
function getCuisineType(place) {
  return (place.types || []).find((t) => !GENERIC_TYPES.includes(t)) || null;
}

/**
 * Pick 2 alternatives from the pool in different cuisine categories than the chosen restaurant.
 * @param {Array} pool - cached restaurant pool
 * @param {object} chosen - the picked restaurant
 * @returns {Array} up to 2 alternatives from different categories
 */
function pickAlternatives(pool, chosen) {
  const chosenType = getCuisineType(chosen);
  const usedTypes = new Set(chosenType ? [chosenType] : []);
  const alts = [];
  // Shuffle pool to get random alternatives
  const shuffled = [...pool].sort(() => Math.random() - 0.5); // eslint-disable-line no-magic-numbers -- random shuffle
  for (const place of shuffled) {
    if (place.place_id === chosen.place_id) continue;
    const type = getCuisineType(place);
    if (type && usedTypes.has(type)) continue;
    if (type) usedTypes.add(type);
    alts.push(place);
    if (alts.length >= 2) break; // eslint-disable-line no-magic-numbers -- 2 alternatives
  }
  return alts;
}

/**
 * Hook that manages the core fork flow: searching, filtering, picking, animations.
 * @param {object} params
 * @param {{ latitude: number, longitude: number }|null} params.coords
 * @param {() => Promise<object|null>} params.ensureLocation
 * @param {number} params.radiusMeters
 * @param {number} params.radiusMiles
 * @param {string} params.travelMode
 * @param {(mode: string) => void} params.setTravelMode
 * @param {(miles: number) => void} params.setRadiusMiles
 * @param {string} params.cuisineKeyword
 * @param {string} params.excludeKeyword
 * @param {boolean} params.openNow
 * @param {number} params.maxPrice
 * @param {number} params.minRating
 * @param {boolean} params.hiddenGems
 * @param {object|null} params.customLocation
 * @param {(v: boolean) => void} params.setFiltersExpanded
 * @param {Array} params.favorites
 * @param {Array} params.blockedIds
 * @param {Array} params.customPlaces
 * @param {(type: string) => boolean} params.checkQuota
 * @param {(type: string) => void} params.incrementUsage
 * @param {() => object} params.getCurrentUsage
 * @param {(text: string, kind: string, ms?: number) => void} params.showToast
 * @param {(title: string, message?: string, buttons?: Array) => void} params.showDialog
 * @param {{ current: object }} params.scrollViewRef
 * @param {{ current: object }} params.resultCardRef
 * @param {boolean} params.isPro
 * @param {(line: string) => void} params.setStatusLine
 * @param {(line: string) => void} params.setForkingLine
 * @param {{ current: number }} params.apiFetchCountRef
 * @returns {object} Fork state, actions, animation values, and derived display values
 */
// eslint-disable-next-line sonarjs/cognitive-complexity, max-lines-per-function -- main fork engine hook
export default function useForkEngine({
  coords,
  ensureLocation,
  radiusMeters,
  radiusMiles,
  travelMode,
  setTravelMode,
  setRadiusMiles,
  cuisineKeyword,
  excludeKeyword,
  openNow,
  maxPrice,
  minRating,
  hiddenGems,
  customLocation,
  setFiltersExpanded,
  favorites,
  blockedIds,
  customPlaces,
  checkQuota,
  incrementUsage,
  getCurrentUsage,
  isPro,
  showToast,
  showDialog,
  scrollViewRef,
  resultCardRef,
  setStatusLine,
  setForkingLine,
  apiFetchCountRef,
}) {
  // Fork state
  const [loading, setLoading] = useState(false);
  const [poolCount, setPoolCount] = useState(0);
  const [recentlyShown, setRecentlyShown] = useState([]);
  const [slotText, setSlotText] = useState('');
  const [picked, setPicked] = useState(null);
  const [pickedDetails, setPickedDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [alternatives, setAlternatives] = useState([]);

  // Refs
  const poolCacheRef = useRef({
    results: [],
    fetchedAt: 0,
    filterKey: '',
  });
  // Holds the fully-filtered pool from the last fork — used by swapAlternative so
  // that swap-in re-rolls respect every active filter (chains, price, rating, etc.).
  const filteredPoolRef = useRef([]);
  const isForkingRef = useRef(false);
  const forkCooldownRef = useRef(0);
  const forkTapsRef = useRef([]);
  const walkSuggestedRef = useRef(false);

  // Animations
  const spin = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;

  const spinDeg = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const bounceY = bounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BOUNCE_OFFSET],
  });

  function animateForking() {
    spin.setValue(0);
    bounce.setValue(0);

    Animated.parallel([
      Animated.timing(spin, {
        toValue: 1,
        duration: 650,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 140, useNativeDriver: true }),
      ]),
    ]).start();
  }

  function isThrottled() {
    const now = Date.now();
    forkTapsRef.current = forkTapsRef.current.filter((t) => now - t < THROTTLE_WINDOW);
    if (forkTapsRef.current.length >= THROTTLE_MAX_TAPS) {
      showToast('Easy there, slow down a bit!', 'warn', THROTTLE_TOAST_MS);
      return true;
    }
    forkTapsRef.current.push(now);
    return false;
  }

  function handleForkError(e) {
    const code = e?.message || '';
    if (code === 'RATE_LIMIT') {
      showDialog('Slow Down', 'Too many requests. Please wait a moment and try again.');
    } else if (code === 'SERVER_ERROR') {
      showDialog('Server Error', 'Something went wrong on our end. Please try again.');
    } else if (code === 'SEARCH_FAILED') {
      showDialog(
        'Search Failed',
        'Could not complete the restaurant search. Try adjusting your filters.',
      );
    } else if (e?.name === 'AbortError' || code === 'AbortError') {
      showDialog('Timeout', 'The search took too long. Check your connection and try again.');
    } else {
      showDialog('Error', 'Something unexpected happened. Please try again.');
    }
  }

  async function fetchNearbyPlaces(currentCoords) {
    const { latitude, longitude } = currentCoords;
    const integrityToken = await getIntegrityToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(`${BACKEND_URL}/api/places`, {
      method: 'POST',
      headers: {
        ...backendHeaders(),
        'Content-Type': 'application/json',
        'X-Integrity-Token': integrityToken || '',
      },
      body: JSON.stringify({
        latitude,
        longitude,
        radius: radiusMeters,
        keyword: cuisineKeyword.trim(),
        userTier: isPro ? 'pro' : 'free', // CRITICAL — Cost Gate: determines backend field mask tier
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.status === HTTP_TOO_MANY_REQUESTS) throw new Error('RATE_LIMIT');
    if (!response.ok) throw new Error('SERVER_ERROR');

    const data = await response.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') throw new Error('SEARCH_FAILED');

    return Array.isArray(data.results) ? data.results : [];
  }

  function filterAndEnrichResults(raw, recentOverride) {
    const recentSet = new Set(recentOverride !== undefined ? recentOverride : recentlyShown);
    const excludeTerms = excludeKeyword
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    let results = raw.filter((r) => {
      if (recentSet.has(r.place_id)) return false;
      if (isBlocked(r.place_id, r.name, blockedIds)) return false;
      if (hiddenGems && looksLikeChainByName(r.name)) return false;
      return !matchesExclude(r, excludeTerms);
    });
    const searchCoords = customLocation || coords;
    const eligibleCustom = customPlaces.filter((cp) => {
      if (recentSet.has(cp.place_id)) return false;
      if (isBlocked(cp.place_id, cp.name, blockedIds)) return false;
      if (searchCoords) {
        if (cp.lat === null || cp.lat === undefined || cp.lng === null || cp.lng === undefined)
          return false;
        const dist = haversineDistanceMiles(
          searchCoords.latitude,
          searchCoords.longitude,
          cp.lat,
          cp.lng,
        );
        if (dist > radiusMiles) return false;
      }
      if (excludeTerms.length > 0) {
        const nameLower = (cp.name || '').toLowerCase();
        const tagsLower = (cp.tags || '').toLowerCase();
        if (excludeTerms.some((t) => nameLower.includes(t) || tagsLower.includes(t))) return false;
      }
      if (cuisineKeyword.trim()) {
        const kw = cuisineKeyword.trim().toLowerCase();
        const tagsLower = (cp.tags || '').toLowerCase();
        const nameLower = (cp.name || '').toLowerCase();
        if (!tagsLower.includes(kw) && !nameLower.includes(kw)) return false;
      }
      return true;
    });
    if (eligibleCustom.length > 0) {
      results = [...results, ...eligibleCustom];
    }
    return results;
  }

  function maybeNudgeWalkMode(resultCount) {
    if (walkSuggestedRef.current || travelMode !== 'drive' || resultCount < WALK_RESULTS_THRESHOLD)
      return;
    walkSuggestedRef.current = true;
    setTimeout(() => {
      showDialog('Lots of spots nearby!', 'Try switching to walk mode for closer picks.', [
        {
          text: 'Switch to Walk',
          onPress: () => {
            setTravelMode('walk');
            setRadiusMiles(WALK_RADIUS_DEFAULT);
            AsyncStorage.setItem(STORAGE_KEYS.TRAVEL_MODE, 'walk').catch(() => {});
          },
        },
        { text: 'Keep Driving', style: 'cancel' },
      ]);
    }, WALK_SUGGEST_DELAY);
  }

  async function runSlotReveal(results) {
    const cycles = Math.min(SLOT_MAX_CYCLES, Math.max(SLOT_MIN_CYCLES, results.length));
    const forkEmojis = ['🍴', '🥄', '🔱', '⚡'];
    for (let i = 0; i < cycles; i++) {
      const peek =
        i % 3 === 0 ? forkEmojis[i % 4] : results[i % results.length]?.name || 'Forking…';
      setSlotText(peek);
      await haptics.selectionAsync();
      await sleep(SLOT_BASE_DELAY + i * SLOT_INCREMENT);
    }
  }

  function buildFilterKey(currentCoords) {
    const LAT_LNG_PRECISION = 1000;
    return JSON.stringify({
      lat: Math.round(currentCoords.latitude * LAT_LNG_PRECISION) / LAT_LNG_PRECISION,
      lng: Math.round(currentCoords.longitude * LAT_LNG_PRECISION) / LAT_LNG_PRECISION,
      r: radiusMeters,
      kw: cuisineKeyword.trim(),
      tier: isPro ? 'pro' : 'free',
    });
  }

  function trackApiFetch() {
    const count = ++apiFetchCountRef.current;
    AsyncStorage.setItem(STORAGE_KEYS.API_FETCH_COUNT, String(count)).catch(() => {});
  }

  async function ensureDetails() {
    if (pickedDetails) return pickedDetails;
    if (!picked?.place_id || picked.isCustom) return null;
    if (detailsLoading) return null;
    setDetailsLoading(true);
    try {
      const details = await getPlaceDetails(picked.place_id);
      setPickedDetails(details);
      return details;
    } finally {
      setDetailsLoading(false);
    }
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity, max-lines-per-function -- main fork flow
  async function forkIt() {
    if (isForkingRef.current) return;
    if (Date.now() < forkCooldownRef.current) return;
    if (isThrottled()) return;

    isForkingRef.current = true;
    setLoading(true);

    if (!BACKEND_URL) {
      showDialog('Configuration Error', 'Backend URL not configured. Please check your .env file.');
      setLoading(false);
      isForkingRef.current = false;
      return;
    }

    let currentCoords;
    if (customLocation) {
      currentCoords = { latitude: customLocation.latitude, longitude: customLocation.longitude };
    } else {
      try {
        currentCoords = await ensureLocation();
      } catch (_) {
        showDialog(
          'Location error',
          'Could not get your location. Please check that location services are enabled.',
        );
        setLoading(false);
        isForkingRef.current = false;
        return;
      }
      if (!currentCoords) {
        setLoading(false);
        isForkingRef.current = false;
        return;
      }
    }
    setPicked(null);
    setPickedDetails(null);
    setSlotText('');
    setStatusLine('Picking…');
    setForkingLine(pickRandom(FORKING_LINES));

    try {
      animateForking();
      await haptics.selectionAsync();

      if (
        typeof currentCoords.latitude !== 'number' ||
        typeof currentCoords.longitude !== 'number'
      ) {
        showDialog('Location error', 'Could not get valid coordinates. Please try again.');
        setLoading(false);
        isForkingRef.current = false;
        return;
      }

      // CRITICAL — Cost Gate + Revenue Gate: pool cache prevents re-fetching the same area.
      // Without cache: every fork = API call (10x cost). Without the cache-miss quota check:
      // free users get charged quota on re-rolls. Both must stay in this exact order.
      const currentFilterKey = buildFilterKey(currentCoords);
      const cache = poolCacheRef.current;
      const cacheAge = Date.now() - cache.fetchedAt;
      const cacheValid =
        cache.results.length > 0 &&
        cache.filterKey === currentFilterKey &&
        cacheAge < POOL_STALE_MS;

      let raw;
      if (cacheValid) {
        raw = cache.results;
      } else {
        // CRITICAL — Revenue Gate: quota check only on actual API fetch. Re-rolls from cache are free.
        if (!checkQuota('solo')) {
          setLoading(false);
          isForkingRef.current = false;
          return;
        }
        raw = await fetchNearbyPlaces(currentCoords);
        // Store the full unfiltered pool in cache
        poolCacheRef.current = {
          results: raw,
          fetchedAt: Date.now(),
          filterKey: currentFilterKey,
        };
        trackApiFetch();
        incrementUsage('solo');
        maybePromptReview(getCurrentUsage().solo);
      }

      let results = filterAndEnrichResults(raw);

      // If the pool has places but all were recently shown, reset and cycle again
      if (!results.length && raw.length > 0 && recentlyShown.length > 0) {
        setRecentlyShown([]);
        results = filterAndEnrichResults(raw, []);
      }

      setPoolCount(results.length);
      maybeNudgeWalkMode(raw.length);

      if (!results.length) {
        await haptics.notificationAsync(haptics.NotificationFeedbackType.Warning);

        // Build a dynamic hint based on active filters
        const hints = [];
        if (cuisineKeyword.trim()) hints.push('remove the keyword');
        if (excludeKeyword.trim()) hints.push('clear the exclude filter');
        if (radiusMiles < 10) hints.push('increase the radius');
        if (minRating > RATING_LOW) hints.push('lower the rating filter');
        if (maxPrice < 4) hints.push('raise the price filter');
        if (openNow) hints.push('turn off "Open Now"');
        if (hiddenGems) hints.push('turn off "Hidden Gems"');
        const hint = hints.length
          ? `Tip: try ${hints.slice(0, 3).join(', ')}.`
          : 'Try a different location.';

        setStatusLine(`Nothing matched. ${hint}`);
        setForkingLine('');
        showToast(pickRandom(FAIL_LINES), 'warn', TOAST_LONG);
        return;
      }

      // Filter pool using search result data directly — rating/price/openNow are
      // included in the search response for Pro users (Enterprise field mask).
      // Free users get Pro field mask — no rating/price/hours data, so skip those filters.
      if (isPro) {
        if (openNow) {
          results = results.filter(
            (r) => r.isCustom || (r.opening_hours && r.opening_hours.open_now),
          );
        }
        if (maxPrice < 4) {
          results = results.filter(
            (r) =>
              r.isCustom ||
              r.price_level === null ||
              r.price_level === undefined ||
              r.price_level <= maxPrice,
          );
        }
        if (minRating > 0) {
          results = results.filter((r) => r.isCustom || (r.rating || 0) >= minRating);
        }
        // Exclude places closing within threshold (requires opening_hours)
        results = results.filter((r) => {
          if (r.isCustom) return true;
          const mins = getMinutesUntilClosing(r.opening_hours);
          return mins === null || mins >= CLOSING_SOON_EXCLUDE_MIN;
        });
      }
      if (hiddenGems) {
        results = results.filter(
          (r) => r.isCustom || !looksLikeChain(r.name, r.user_ratings_total),
        );
      }

      if (!results.length) {
        await haptics.notificationAsync(haptics.NotificationFeedbackType.Warning);
        setStatusLine('Nothing matched your filters. Try loosening them.');
        setForkingLine('');
        showToast(pickRandom(FAIL_LINES), 'warn', TOAST_LONG);
        return;
      }

      const chosen = pickRandom(results);

      await runSlotReveal(results);
      await sleep(DRAMATIC_PAUSE);

      setPicked(chosen);
      setSlotText('');
      setFiltersExpanded(false);
      setStatusLine(pickRandom(SUCCESS_LINES));
      setForkingLine('');
      await haptics.notificationAsync(haptics.NotificationFeedbackType.Success);

      // Save to local history (fire-and-forget)
      saveToHistory({
        name: chosen.name || chosen.displayName || 'Unknown',
        address: chosen.vicinity || chosen.formattedAddress || '',
        type: 'solo',
        place_id: chosen.place_id,
      }).catch((e) => {
        Sentry.addBreadcrumb({
          category: 'history',
          message: 'saveToHistory failed',
          level: 'warning',
          data: { error: e.message },
        });
      });

      // Persist the fully-filtered pool so swapAlternative can re-roll alts
      // through the same filter chain (chains, price, rating, closing-soon).
      filteredPoolRef.current = results;

      // Generate cross-category alternatives for Pro users
      if (isPro) {
        setAlternatives(pickAlternatives(results, chosen));
      } else {
        setAlternatives([]);
      }

      const detailHours = chosen.opening_hours;
      const hurryMsg = getClosingSoonToast(
        getMinutesUntilClosing(detailHours),
        travelMode,
        radiusMiles,
      );
      if (hurryMsg) {
        showToast(`Closing soon: ${hurryMsg}`, 'warn', TOAST_LONG);
      } else {
        showToast('Forking complete. Bon appétit! 🍴', 'success', TOAST_DEFAULT);
      }

      // Track this restaurant to avoid showing it again soon
      setRecentlyShown((prev) => [chosen.place_id, ...prev].slice(0, RECENTLY_SHOWN_MAX));

      // Scroll down to show result card (push header off screen)
      setTimeout(() => {
        if (resultCardRef?.current && scrollViewRef.current) {
          resultCardRef.current.measureLayout(
            scrollViewRef.current.getInnerViewRef(),
            (_x, y) => {
              scrollViewRef.current.scrollTo({ y: Math.max(0, y - 10), animated: true }); // eslint-disable-line no-magic-numbers -- small top padding
            },
            () => {
              // Fallback: scroll to top if measurement fails
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            },
          );
        } else {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }
      }, 100); // eslint-disable-line no-magic-numbers -- brief delay for layout

      // Details fetched on-demand via ensureDetails() when user taps for more info
      setPickedDetails(null);
    } catch (e) {
      handleForkError(e);
    } finally {
      setLoading(false);
      isForkingRef.current = false;
      forkCooldownRef.current = Date.now() + FORK_COOLDOWN_MS;
    }
  }

  // Derived display values
  const placeName = useMemo(
    () => pickedDetails?.name || picked?.name,
    [pickedDetails?.name, picked?.name],
  );
  const signatureDish = useMemo(
    () => (placeName ? getSignatureDish(placeName) : null),
    [placeName],
  );
  const recipeLinks = useMemo(() => {
    if (!placeName || !signatureDish) return [];
    const dish = signatureDish === 'Signature dish' ? '' : signatureDish;
    return buildRecipeLinks(placeName, dish);
  }, [placeName, signatureDish]);

  const rating = pickedDetails?.rating ?? picked?.rating ?? null;
  const price = pickedDetails?.price_level ?? picked?.price_level ?? null;
  const vicinity = pickedDetails?.vicinity ?? picked?.vicinity ?? '';

  const isFavorite = useMemo(
    () => (picked ? favorites.some((f) => f.place_id === picked.place_id) : false),
    [picked, favorites],
  );

  /**
   * Swap an alternative in as the main pick and regenerate alternatives.
   * @param {object} alt - alternative restaurant to swap in
   */
  function swapAlternative(alt) {
    setPicked(alt);
    setPickedDetails(null);
    setAlternatives(pickAlternatives(filteredPoolRef.current, alt));
    saveToHistory({
      name: alt.name || alt.displayName || 'Unknown',
      address: alt.vicinity || alt.formattedAddress || '',
      type: 'solo',
      place_id: alt.place_id,
    }).catch(() => {});
  }

  return {
    loading,
    poolCount,
    recentlyShown,
    setRecentlyShown,
    slotText,
    picked,
    setPicked,
    pickedDetails,
    setPickedDetails,
    detailsLoading,
    forkIt,
    ensureDetails,
    apiFetchCountRef,
    spinDeg,
    bounceY,
    placeName,
    signatureDish,
    recipeLinks,
    rating,
    price,
    vicinity,
    isFavorite,
    alternatives,
    swapAlternative,
  };
}
