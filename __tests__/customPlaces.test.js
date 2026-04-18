/* eslint-disable no-magic-numbers, sonarjs/no-duplicate-string -- test data */
import { addCustomPlace, findDupe, dupeMessage } from '../utils/customPlaces';

// Mock AsyncStorage (imported by helpers.js via safeStore)
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
}));

// ─── findDupe ────────────────────────────────────────────────────────────────

describe('findDupe', () => {
  const spots = [
    { name: "Mom's House", vicinity: '123 Main St', place_id: 'c1' },
    { name: 'Office Lunch', vicinity: '456 Work Ave', place_id: 'c2' },
    { name: 'No Address Spot', vicinity: '', place_id: 'c3' },
  ];

  test('returns null when no duplicate', () => {
    expect(findDupe('New Place', '789 New St', spots)).toBeNull();
  });

  test('detects duplicate name (case-insensitive)', () => {
    const result = findDupe("MOM'S HOUSE", '999 Other St', spots);
    expect(result).not.toBeNull();
    expect(result.reason).toBe('name');
    expect(result.dupe).toBe("Mom's House");
  });

  test('detects duplicate name with extra whitespace', () => {
    const result = findDupe("  Mom's House  ", '999 Other St', spots);
    expect(result).not.toBeNull();
    expect(result.reason).toBe('name');
  });

  test('detects duplicate address (case-insensitive)', () => {
    const result = findDupe('Different Name', '123 MAIN ST', spots);
    expect(result).not.toBeNull();
    expect(result.reason).toBe('address');
    expect(result.dupe).toBe("Mom's House");
  });

  test('skips address check when address is empty', () => {
    const result = findDupe('Totally New', '', spots);
    expect(result).toBeNull();
  });

  test('name match takes priority over address match', () => {
    const result = findDupe("Mom's House", '456 Work Ave', spots);
    expect(result.reason).toBe('name');
  });
});

// ─── dupeMessage ─────────────────────────────────────────────────────────────

describe('dupeMessage', () => {
  test('formats name duplicate message', () => {
    const msg = dupeMessage({ reason: 'name', dupe: "Mom's House", dupeAddr: '123 Main St' });
    expect(msg).toContain("Mom's House");
    expect(msg).toContain('123 Main St');
    expect(msg).toContain('Not saved');
  });

  test('formats name duplicate without address', () => {
    const msg = dupeMessage({ reason: 'name', dupe: 'Test Spot' });
    expect(msg).toContain('Test Spot');
    expect(msg).not.toContain('undefined');
  });

  test('formats address duplicate message', () => {
    const msg = dupeMessage({ reason: 'address', dupe: 'Office Lunch' });
    expect(msg).toContain('address');
    expect(msg).toContain('Office Lunch');
  });
});

// ─── addCustomPlace ──────────────────────────────────────────────────────────

describe('addCustomPlace', () => {
  test('adds a new place successfully', () => {
    const currentCustom = [];
    const setCustom = jest.fn();
    const result = addCustomPlace('New Spot', '123 Test St', {
      currentCustom,
      setCustom,
    });
    expect(result.ok).toBe(true);
    expect(setCustom).toHaveBeenCalledTimes(1);
    const added = setCustom.mock.calls[0][0][0];
    expect(added.name).toBe('New Spot');
    expect(added.vicinity).toBe('123 Test St');
    expect(added.isCustom).toBe(true);
    expect(added.place_id).toMatch(/^custom_/);
  });

  test('rejects empty name', () => {
    const result = addCustomPlace('   ', '', {
      currentCustom: [],
      setCustom: jest.fn(),
    });
    expect(result.ok).toBe(false);
  });

  test('rejects duplicate name', () => {
    const existing = [{ name: 'Test Place', vicinity: '123 St', place_id: 'c1' }];
    const result = addCustomPlace('test place', '999 Other', {
      currentCustom: existing,
      setCustom: jest.fn(),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('name');
    expect(result.dupe).toBe('Test Place');
  });

  test('rejects duplicate address', () => {
    const existing = [{ name: 'Place A', vicinity: '123 Main St', place_id: 'c1' }];
    const result = addCustomPlace('Different Name', '123 main st', {
      currentCustom: existing,
      setCustom: jest.fn(),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('address');
  });

  test('allows empty address without address dupe check', () => {
    const existing = [{ name: 'Place A', vicinity: '', place_id: 'c1' }];
    const result = addCustomPlace('Place B', '', {
      currentCustom: existing,
      setCustom: jest.fn(),
    });
    expect(result.ok).toBe(true);
  });

  test('stores lat/lng when provided', () => {
    const setCustom = jest.fn();
    addCustomPlace('Geo Spot', '123 St', {
      lat: 38.9,
      lng: -77.0,
      currentCustom: [],
      setCustom,
    });
    const added = setCustom.mock.calls[0][0][0];
    expect(added.lat).toBe(38.9);
    expect(added.lng).toBe(-77.0);
  });
});
