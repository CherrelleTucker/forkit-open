/* eslint-disable no-magic-numbers */
// Tests for exportImport.js merge logic.

jest.mock('expo-document-picker', () => ({}));
jest.mock('expo-file-system/legacy', () => ({}));
jest.mock('expo-sharing', () => ({}));

import { mergeByKey } from '../utils/exportImport';

describe('mergeByKey', () => {
  // ─── Favorites (keyed by place_id) ──────────────────────────

  it('merges non-overlapping favorites', () => {
    const existing = [{ place_id: 'A', name: 'Spot A' }];
    const incoming = [{ place_id: 'B', name: 'Spot B' }];
    const result = mergeByKey(existing, incoming, (f) => f.place_id);
    expect(result).toHaveLength(2);
    expect(result[0].place_id).toBe('A');
    expect(result[1].place_id).toBe('B');
  });

  it('deduplicates by place_id — existing wins', () => {
    const existing = [{ place_id: 'A', name: 'Original' }];
    const incoming = [{ place_id: 'A', name: 'Duplicate' }];
    const result = mergeByKey(existing, incoming, (f) => f.place_id);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Original');
  });

  it('handles empty existing array', () => {
    const result = mergeByKey([], [{ place_id: 'A' }], (f) => f.place_id);
    expect(result).toHaveLength(1);
    expect(result[0].place_id).toBe('A');
  });

  it('handles empty incoming array', () => {
    const existing = [{ place_id: 'A' }];
    const result = mergeByKey(existing, [], (f) => f.place_id);
    expect(result).toHaveLength(1);
  });

  it('handles both empty arrays', () => {
    const result = mergeByKey([], [], (f) => f.place_id);
    expect(result).toHaveLength(0);
  });

  it('preserves order — existing first, then new', () => {
    const existing = [{ place_id: 'B' }, { place_id: 'A' }];
    const incoming = [{ place_id: 'C' }, { place_id: 'A' }];
    const result = mergeByKey(existing, incoming, (f) => f.place_id);
    expect(result.map((r) => r.place_id)).toEqual(['B', 'A', 'C']);
  });

  it('handles multiple duplicates in incoming', () => {
    const existing = [{ place_id: 'A' }];
    const incoming = [{ place_id: 'A' }, { place_id: 'A' }, { place_id: 'B' }];
    const result = mergeByKey(existing, incoming, (f) => f.place_id);
    expect(result).toHaveLength(2);
  });

  // ─── Custom places (keyed by name||address composite) ───────

  it('deduplicates custom places by name+address composite key', () => {
    const keyFn = (c) => `${(c.name || '').toLowerCase()}||${(c.vicinity || '').toLowerCase()}`;
    const existing = [{ name: 'Taco Spot', vicinity: '123 Main St' }];
    const incoming = [{ name: 'taco spot', vicinity: '123 main st' }];
    const result = mergeByKey(existing, incoming, keyFn);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Taco Spot');
  });

  it('treats different addresses as different spots', () => {
    const keyFn = (c) => `${(c.name || '').toLowerCase()}||${(c.vicinity || '').toLowerCase()}`;
    const existing = [{ name: 'Taco Spot', vicinity: '123 Main St' }];
    const incoming = [{ name: 'Taco Spot', vicinity: '456 Oak Ave' }];
    const result = mergeByKey(existing, incoming, keyFn);
    expect(result).toHaveLength(2);
  });

  it('handles custom places with no name and no address', () => {
    const keyFn = (c) => `${(c.name || '').toLowerCase()}||${(c.vicinity || '').toLowerCase()}`;
    const existing = [{ name: '', vicinity: '' }];
    const incoming = [{ name: '', vicinity: '' }];
    // Both produce key '||' — existing wins, only 1 result
    const result = mergeByKey(existing, incoming, keyFn);
    expect(result).toHaveLength(1);
  });

  it('handles custom places with undefined name/vicinity', () => {
    const keyFn = (c) => `${(c.name || '').toLowerCase()}||${(c.vicinity || '').toLowerCase()}`;
    const existing = [{ tags: 'mexican' }]; // no name or vicinity
    const incoming = [{ tags: 'thai' }]; // no name or vicinity either
    // Both produce key '||' — collapses to 1
    const result = mergeByKey(existing, incoming, keyFn);
    expect(result).toHaveLength(1);
  });

  // ─── Blocked places (keyed by place_id) ─────────────────────

  it('merges blocked lists without duplicates', () => {
    const existing = [{ place_id: 'X' }, { place_id: 'Y' }];
    const incoming = [{ place_id: 'Y' }, { place_id: 'Z' }];
    const result = mergeByKey(existing, incoming, (b) => b.place_id);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.place_id)).toEqual(['X', 'Y', 'Z']);
  });

  // ─── Large data ─────────────────────────────────────────────

  it('handles large arrays efficiently', () => {
    const existing = Array.from({ length: 500 }, (_, i) => ({ place_id: `e${i}` }));
    const incoming = Array.from({ length: 500 }, (_, i) => ({ place_id: `i${i}` }));
    const result = mergeByKey(existing, incoming, (f) => f.place_id);
    expect(result).toHaveLength(1000);
  });

  it('handles large arrays with full overlap', () => {
    const existing = Array.from({ length: 500 }, (_, i) => ({ place_id: `p${i}` }));
    const incoming = Array.from({ length: 500 }, (_, i) => ({ place_id: `p${i}` }));
    const result = mergeByKey(existing, incoming, (f) => f.place_id);
    expect(result).toHaveLength(500);
  });
});
