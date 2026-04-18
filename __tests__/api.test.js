/* eslint-disable no-magic-numbers -- test data */
import { backendHeaders, checkAppVersion } from '../utils/api';

// Mock React Native
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

// ─── backendHeaders ──────────────────────────────────────────────────────────

describe('backendHeaders', () => {
  test('returns object with X-App-Version header', () => {
    const headers = backendHeaders();
    expect(headers).toHaveProperty('X-App-Version');
    expect(typeof headers['X-App-Version']).toBe('string');
  });

  test('version matches semver format', () => {
    const headers = backendHeaders();
    expect(headers['X-App-Version']).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ─── checkAppVersion ─────────────────────────────────────────────────────────

describe('checkAppVersion', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns updateRequired: false when server returns current version', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ minVersion: '1.0.0', latestVersion: '3.0.0' }),
      }),
    );
    const result = await checkAppVersion();
    expect(result.updateRequired).toBe(false);
  });

  test('returns updateRequired: true when app is below minVersion', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ minVersion: '99.0.0', latestVersion: '99.0.0' }),
      }),
    );
    const result = await checkAppVersion();
    expect(result.updateRequired).toBe(true);
  });

  test('returns updateRequired: false on network error (fail open)', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
    const result = await checkAppVersion();
    expect(result.updateRequired).toBe(false);
  });

  test('returns updateRequired: false on non-ok response', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
    const result = await checkAppVersion();
    expect(result.updateRequired).toBe(false);
  });

  test('returns updateRequired: false when minVersion is missing', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ latestVersion: '3.0.0' }),
      }),
    );
    const result = await checkAppVersion();
    expect(result.updateRequired).toBe(false);
  });
});
