// useLocation — Location permission, GPS coordinates, and cached location restore.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { BACKEND_URL, LOCATION_CACHE_TTL_MS, TOAST_SHORT } from '../constants/config';
import { STORAGE_KEYS } from '../constants/storage';
import { safeStore } from '../utils/helpers';
import { getIntegrityToken, verifyIntegrityToken } from '../utils/integrity';
import { requestLocationPermission, getCurrentPosition } from '../utils/location';

/**
 * Hook that manages location permission, GPS coordinates, and cached location.
 * @param {object} params
 * @param {(text: string, kind: string, ms?: number) => void} params.showToast
 * @param {(title: string, message?: string, buttons?: Array) => void} params.showDialog
 * @returns {{ hasLocationPerm: boolean, coords: object|null, setCoords: Function, ensureLocation: Function }}
 */
export default function useLocation({ showToast, showDialog }) {
  const [hasLocationPerm, setHasLocationPerm] = useState(false);
  const [coords, setCoords] = useState(null);
  const initializedRef = useRef(false);

  // Restore cached location from AsyncStorage on mount (within TTL)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    (async () => {
      try {
        const cachedLoc = await AsyncStorage.getItem(STORAGE_KEYS.LAST_LOCATION);
        if (cachedLoc) {
          const parsed = JSON.parse(cachedLoc);
          if (parsed.timestamp && Date.now() - parsed.timestamp < LOCATION_CACHE_TTL_MS) {
            setCoords({ latitude: parsed.latitude, longitude: parsed.longitude });
          } else {
            // Expired — remove to honor privacy policy 1-hour retention claim
            AsyncStorage.removeItem(STORAGE_KEYS.LAST_LOCATION).catch(() => {});
          }
        }
      } catch (_) {
        // Non-critical — location will be re-acquired on next fork
      }
    })();
  }, []);

  // Play Integrity check — Android only, runs silently on launch
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    (async () => {
      try {
        const integrityToken = await getIntegrityToken();
        if (integrityToken && BACKEND_URL) {
          await verifyIntegrityToken(integrityToken, BACKEND_URL);
        }
      } catch (_) {
        // Silent — integrity failure doesn't block the user
      }
    })();
  }, []);

  async function ensureLocation() {
    if (hasLocationPerm && coords) return coords;
    const { status } = await requestLocationPermission();
    if (status !== 'granted') {
      showDialog(
        'Location needed',
        'Please enable location permissions in Settings to use ForkIt!',
      );
      return null;
    }
    setHasLocationPerm(true);
    const loc = await getCurrentPosition();
    const newCoords = loc.coords;
    setCoords(newCoords);
    safeStore(STORAGE_KEYS.LAST_LOCATION, {
      latitude: newCoords.latitude,
      longitude: newCoords.longitude,
      timestamp: Date.now(),
    });
    showToast('Location acquired! Forking now...', 'success', TOAST_SHORT);
    return newCoords;
  }

  return { hasLocationPerm, coords, setCoords, ensureLocation };
}
