/* eslint-disable no-magic-numbers, sonarjs/no-duplicate-string -- test data */
/**
 * Extended API Tests — fetchAddressSuggestions
 * Covers: api-resilience, error-flows patterns
 */
import { fetchAddressSuggestions } from '../utils/api';

// Mock React Native
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

// ═══════════════════════════════════════════════════════════════════════════════
// fetchAddressSuggestions
// ═══════════════════════════════════════════════════════════════════════════════

describe('fetchAddressSuggestions', () => {
  test('returns empty for input under 3 characters', async () => {
    const result = await fetchAddressSuggestions('ab', null);
    expect(result.suggestions).toEqual([]);
    expect(result.error).toBeNull();
  });

  test('returns empty for null input', async () => {
    const result = await fetchAddressSuggestions(null, null);
    expect(result.suggestions).toEqual([]);
  });

  test('returns empty for empty string', async () => {
    const result = await fetchAddressSuggestions('', null);
    expect(result.suggestions).toEqual([]);
  });

  test('returns suggestions on success', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ suggestions: [{ description: '123 Main St' }] }),
      }),
    );
    const result = await fetchAddressSuggestions('123 Main', { latitude: 38.9, longitude: -77.0 });
    expect(result.suggestions).toHaveLength(1);
    expect(result.error).toBeNull();
  });

  test('returns rate_limit error on 429', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 429 }));
    const result = await fetchAddressSuggestions('123 Main', null);
    expect(result.suggestions).toEqual([]);
    expect(result.error).toBe('rate_limit');
  });

  test('returns server error message on non-ok response', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal error' }),
      }),
    );
    const result = await fetchAddressSuggestions('123 Main', null);
    expect(result.suggestions).toEqual([]);
    expect(result.error).toBe('Internal error');
  });

  test('returns "Request timed out" on AbortError', async () => {
    global.fetch = jest.fn(() => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    const result = await fetchAddressSuggestions('123 Main', null);
    expect(result.error).toBe('Request timed out');
  });

  test('returns "Network error" on generic error', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('ECONNREFUSED')));
    const result = await fetchAddressSuggestions('123 Main', null);
    expect(result.error).toBe('Network error');
  });
});
