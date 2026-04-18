/* eslint-disable no-magic-numbers */
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import {
  shouldResetUsage,
  buildResetUsage,
  isQuotaExceeded,
  calcAnnualSavings,
  tierFromProductId,
  buildIncrementedUsage,
} from '../hooks/usageHelpers';

// ─── shouldResetUsage ────────────────────────────────────────

describe('shouldResetUsage', () => {
  it('returns false when month and year match', () => {
    const now = new Date(2026, 2, 15); // March 2026
    expect(shouldResetUsage({ month: 2, year: 2026 }, now)).toBe(false);
  });

  it('returns true when month differs', () => {
    const now = new Date(2026, 3, 1); // April 2026
    expect(shouldResetUsage({ month: 2, year: 2026 }, now)).toBe(true);
  });

  it('returns true when year differs', () => {
    const now = new Date(2027, 2, 15); // March 2027
    expect(shouldResetUsage({ month: 2, year: 2026 }, now)).toBe(true);
  });

  it('returns true when both month and year differ', () => {
    const now = new Date(2027, 5, 1);
    expect(shouldResetUsage({ month: 0, year: 2026 }, now)).toBe(true);
  });

  it('handles December→January year rollover', () => {
    const now = new Date(2027, 0, 1); // Jan 2027
    expect(shouldResetUsage({ month: 11, year: 2026 }, now)).toBe(true);
  });

  it('handles month 0 (January) correctly', () => {
    const now = new Date(2026, 0, 31); // Jan 31
    expect(shouldResetUsage({ month: 0, year: 2026 }, now)).toBe(false);
  });
});

// ─── buildResetUsage ─────────────────────────────────────────

describe('buildResetUsage', () => {
  it('returns zeroed counters with current month/year', () => {
    const now = new Date(2026, 5, 10);
    expect(buildResetUsage(now)).toEqual({ solo: 0, group: 0, month: 5, year: 2026 });
  });

  it('handles January (month 0)', () => {
    const now = new Date(2027, 0, 1);
    expect(buildResetUsage(now)).toEqual({ solo: 0, group: 0, month: 0, year: 2027 });
  });

  it('handles December (month 11)', () => {
    const now = new Date(2026, 11, 31);
    expect(buildResetUsage(now)).toEqual({ solo: 0, group: 0, month: 11, year: 2026 });
  });
});

// ─── isQuotaExceeded ─────────────────────────────────────────

describe('isQuotaExceeded', () => {
  // Free tier: solo = 10, group = 1
  it('allows solo fork when under free limit', () => {
    expect(isQuotaExceeded('solo', { solo: 0, group: 0 }, false, false)).toBe(false);
    expect(isQuotaExceeded('solo', { solo: 9, group: 0 }, false, false)).toBe(false);
  });

  it('blocks solo fork at free limit', () => {
    expect(isQuotaExceeded('solo', { solo: 10, group: 0 }, false, false)).toBe(true);
  });

  it('blocks solo fork above free limit', () => {
    expect(isQuotaExceeded('solo', { solo: 15, group: 0 }, false, false)).toBe(true);
  });

  it('allows first group fork', () => {
    expect(isQuotaExceeded('group', { solo: 0, group: 0 }, false, false)).toBe(false);
  });

  it('blocks group fork at free limit', () => {
    expect(isQuotaExceeded('group', { solo: 0, group: 1 }, false, false)).toBe(true);
  });

  // Pro tier: solo = 20, group = 5
  it('Pro users get higher solo limit', () => {
    expect(isQuotaExceeded('solo', { solo: 10, group: 0 }, true, false)).toBe(false);
    expect(isQuotaExceeded('solo', { solo: 19, group: 0 }, true, false)).toBe(false);
    expect(isQuotaExceeded('solo', { solo: 20, group: 0 }, true, false)).toBe(true);
  });

  it('Pro users get higher group limit', () => {
    expect(isQuotaExceeded('group', { solo: 0, group: 1 }, true, false)).toBe(false);
    expect(isQuotaExceeded('group', { solo: 0, group: 2 }, true, false)).toBe(false);
    expect(isQuotaExceeded('group', { solo: 0, group: 3 }, true, false)).toBe(true);
  });

  // Pro+ bypass — unlimited
  it('Pro+ users bypass solo quota', () => {
    expect(isQuotaExceeded('solo', { solo: 100, group: 0 }, false, true)).toBe(false);
  });

  it('Pro+ users bypass group quota', () => {
    expect(isQuotaExceeded('group', { solo: 0, group: 50 }, false, true)).toBe(false);
  });

  // Edge: unrecognized type defaults to group
  it('defaults to group quota for unknown type', () => {
    expect(isQuotaExceeded('unknown', { solo: 0, group: 1 }, false, false)).toBe(true);
  });
});

// ─── calcAnnualSavings ───────────────────────────────────────

describe('calcAnnualSavings', () => {
  it('calculates correct savings for $1.99/mo vs $14.99/yr', () => {
    // 1 - (14.99 / (1.99 * 12)) = 1 - (14.99 / 23.88) ≈ 0.372 → 37%
    expect(calcAnnualSavings(1.99, 14.99)).toBe(37);
  });

  it('returns 0% savings when annual equals 12x monthly', () => {
    expect(calcAnnualSavings(5.0, 60.0)).toBe(0);
  });

  it('returns null when annual price is 0', () => {
    expect(calcAnnualSavings(1.99, 0)).toBeNull();
  });

  it('returns null when monthly price is 0', () => {
    expect(calcAnnualSavings(0, 14.99)).toBeNull();
  });

  it('returns null when monthly price is negative', () => {
    expect(calcAnnualSavings(-1, 14.99)).toBeNull();
  });

  it('returns null when annual is null', () => {
    expect(calcAnnualSavings(1.99, null)).toBeNull();
  });

  it('returns null when both are undefined', () => {
    expect(calcAnnualSavings(undefined, undefined)).toBeNull();
  });

  it('handles 50% savings correctly', () => {
    // annual = 6 * monthly → 50% savings
    expect(calcAnnualSavings(2.0, 12.0)).toBe(50);
  });

  it('rounds to nearest integer', () => {
    // 1 - (10 / (3 * 12)) = 1 - (10/36) = 1 - 0.2778 = 0.7222 → 72%
    expect(calcAnnualSavings(3.0, 10.0)).toBe(72);
  });
});

// ─── tierFromProductId ───────────────────────────────────────

describe('tierFromProductId', () => {
  it('returns pro for Pro monthly SKU', () => {
    expect(tierFromProductId('com.ctuckersolutions.forkit.pro.monthly')).toBe('pro');
  });

  it('returns pro for Pro annual SKU', () => {
    expect(tierFromProductId('com.ctuckersolutions.forkit.pro.annual')).toBe('pro');
  });

  it('returns pro_plus for Pro+ monthly SKU', () => {
    expect(tierFromProductId('com.ctuckersolutions.forkit.pro_plus.monthly')).toBe('pro_plus');
  });

  it('returns pro_plus for Pro+ annual SKU', () => {
    expect(tierFromProductId('com.ctuckersolutions.forkit.pro_plus.annual')).toBe('pro_plus');
  });

  it('returns pro for Android Pro SKU', () => {
    expect(tierFromProductId('forkit_pro')).toBe('pro');
  });

  it('returns pro_plus for Android Pro+ SKU', () => {
    expect(tierFromProductId('forkit_pro_plus')).toBe('pro_plus');
  });

  it('returns null for unknown product ID', () => {
    expect(tierFromProductId('com.example.unknown')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(tierFromProductId('')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(tierFromProductId(undefined)).toBeNull();
  });
});

// ─── buildIncrementedUsage ───────────────────────────────────

describe('buildIncrementedUsage', () => {
  const now = new Date(2026, 2, 22);

  it('increments solo counter', () => {
    const current = { solo: 5, group: 1, month: 2, year: 2026 };
    const result = buildIncrementedUsage(current, 'solo', now);
    expect(result.solo).toBe(6);
    expect(result.group).toBe(1);
  });

  it('increments group counter', () => {
    const current = { solo: 5, group: 0, month: 2, year: 2026 };
    const result = buildIncrementedUsage(current, 'group', now);
    expect(result.solo).toBe(5);
    expect(result.group).toBe(1);
  });

  it('does not mutate original object', () => {
    const current = { solo: 3, group: 0, month: 2, year: 2026 };
    buildIncrementedUsage(current, 'solo', now);
    expect(current.solo).toBe(3);
  });

  it('stamps current month/year', () => {
    const current = { solo: 0, group: 0, month: 1, year: 2025 };
    const result = buildIncrementedUsage(current, 'solo', now);
    expect(result.month).toBe(2);
    expect(result.year).toBe(2026);
  });

  it('defaults unknown type to group', () => {
    const current = { solo: 0, group: 2, month: 2, year: 2026 };
    const result = buildIncrementedUsage(current, 'unknown', now);
    expect(result.group).toBe(3);
    expect(result.solo).toBe(0);
  });

  it('handles incrementing from zero', () => {
    const current = { solo: 0, group: 0, month: 2, year: 2026 };
    expect(buildIncrementedUsage(current, 'solo', now).solo).toBe(1);
    expect(buildIncrementedUsage(current, 'group', now).group).toBe(1);
  });
});
