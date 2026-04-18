import * as Location from 'expo-location';
import { Platform } from 'react-native';

/**
 * Request foreground location permission. Uses browser Permissions API on web, expo-location on native.
 * @returns {Promise<{status: string}>} Permission result with status 'granted' or 'denied'
 */
export async function requestLocationPermission() {
  if (Platform.OS === 'web') {
    if (!navigator.geolocation) {
      return { status: 'denied' };
    }

    // Use Permissions API to check current state without triggering a prompt
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        // "granted" = already allowed, "prompt" = will ask on next request (treat as granted)
        // "denied" = user has blocked it
        if (result.state === 'denied') {
          return { status: 'denied' };
        }
      } catch (_) {
        // Permissions API not supported for geolocation in this browser, proceed anyway
      }
    }

    return { status: 'granted' };
  }

  return Location.requestForegroundPermissionsAsync();
}

/**
 * Get current device position. Uses browser Geolocation API on web, expo-location on native.
 * @returns {Promise<{coords: {latitude: number, longitude: number, accuracy: number}}>}
 */
export async function getCurrentPosition() {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            },
          });
        },
        (error) => {
          reject(new Error(error.message));
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000,
        },
      );
    });
  }

  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
}
