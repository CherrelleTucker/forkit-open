// ForkIt — Export/import user data (favorites, blocked, custom spots)

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { STORAGE_KEYS } from '../constants/storage';

const EXPORT_VERSION = 1;

/**
 * Export user data (favorites, blocked, custom spots) to a JSON file via share sheet.
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function exportUserData() {
  try {
    const [rawFavs, rawBlocked, rawCustom] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
      AsyncStorage.getItem(STORAGE_KEYS.BLOCKED),
      AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_PLACES),
    ]);

    const data = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      favorites: rawFavs ? JSON.parse(rawFavs) : [],
      blocked: rawBlocked ? JSON.parse(rawBlocked) : [],
      customPlaces: rawCustom ? JSON.parse(rawCustom) : [],
    };

    const json = JSON.stringify(data, null, 2);
    const path = `${FileSystem.cacheDirectory}forkit-backup.json`;
    await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return { success: false, error: 'Sharing is not available on this device.' };

    await Sharing.shareAsync(path, { mimeType: 'application/json', UTI: 'public.json' });
    return { success: true, error: null };
  } catch (_) {
    return { success: false, error: 'Export failed. Please try again.' };
  }
}

/**
 * Import user data from a JSON file. Merges with existing data (no duplicates).
 * @returns {Promise<{success: boolean, counts: {favorites: number, blocked: number, customPlaces: number}|null, error: string|null}>}
 */
export async function importUserData() {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return { success: false, counts: null, error: null };

    const file = result.assets?.[0];
    if (!file?.uri) return { success: false, counts: null, error: 'No file selected.' };

    const json = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const data = JSON.parse(json);

    if (!data || typeof data !== 'object' || !data.version) {
      return { success: false, counts: null, error: 'Invalid backup file.' };
    }

    const imported = {
      favorites: Array.isArray(data.favorites) ? data.favorites : [],
      blocked: Array.isArray(data.blocked) ? data.blocked : [],
      customPlaces: Array.isArray(data.customPlaces) ? data.customPlaces : [],
    };

    // Merge with existing data (dedupe by place_id / custom spot name+address)
    const [rawFavs, rawBlocked, rawCustom] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
      AsyncStorage.getItem(STORAGE_KEYS.BLOCKED),
      AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_PLACES),
    ]);

    const existing = {
      favorites: rawFavs ? JSON.parse(rawFavs) : [],
      blocked: rawBlocked ? JSON.parse(rawBlocked) : [],
      customPlaces: rawCustom ? JSON.parse(rawCustom) : [],
    };

    const mergedFavs = mergeByKey(existing.favorites, imported.favorites, (f) => f.place_id);
    const mergedBlocked = mergeByKey(existing.blocked, imported.blocked, (b) => b.place_id);
    const mergedCustom = mergeByKey(
      existing.customPlaces,
      imported.customPlaces,
      (c) => `${(c.name || '').toLowerCase()}||${(c.vicinity || '').toLowerCase()}`,
    );

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(mergedFavs)),
      AsyncStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(mergedBlocked)),
      AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_PLACES, JSON.stringify(mergedCustom)),
    ]);

    return {
      success: true,
      counts: {
        favorites: mergedFavs.length - existing.favorites.length,
        blocked: mergedBlocked.length - existing.blocked.length,
        customPlaces: mergedCustom.length - existing.customPlaces.length,
      },
      error: null,
    };
  } catch (_) {
    return { success: false, counts: null, error: 'Import failed. Check the file and try again.' };
  }
}

/**
 * Merge two arrays by key, existing wins on duplicates.
 * @param {Array} existing
 * @param {Array} incoming
 * @param {Function} keyFn
 * @returns {Array}
 */
export function mergeByKey(existing, incoming, keyFn) {
  const seen = new Set(existing.map(keyFn));
  const added = incoming.filter((item) => !seen.has(keyFn(item)));
  return [...existing, ...added];
}
