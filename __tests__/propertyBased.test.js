/* eslint-disable no-magic-numbers, sonarjs/no-duplicate-string -- test data */
/**
 * Property-Based / Adversarial Input Tests
 * Covers: property-based pattern (without fast-check dependency)
 * Tests normalize, buildRecipeLinks, matchesExclude with adversarial strings
 */
import { normalize, buildRecipeLinks, matchesExclude } from '../utils/helpers';

// Adversarial strings that cover common edge cases
const adversarialStrings = [
  '', // empty
  '   ', // whitespace only
  'null', // literal "null"
  'undefined', // literal "undefined"
  '<script>alert(1)</script>', // XSS attempt
  "'; DROP TABLE users; --", // SQL injection
  '${process.env.SECRET}', // template injection
  '\x00\x01\x02', // null bytes
  'a'.repeat(10000), // very long string
  '🍕🍔🌮🍜', // emoji
  '日本語テスト', // CJK
  'مرحبا', // RTL Arabic
  '\t\n\r', // control characters
  "Robert'); DROP TABLE Students;--", // Bobby Tables
  'Über Grüße Straße', // German umlauts
  '   MiXeD   cAsE   ', // mixed case with whitespace
];

// ═══════════════════════════════════════════════════════════════════════════════
// normalize — never throws for any input
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalize — adversarial inputs', () => {
  test.each(adversarialStrings)('never throws for: %s', (input) => {
    expect(() => normalize(input)).not.toThrow();
  });

  test.each(adversarialStrings)('output is always a string', (input) => {
    const result = normalize(input);
    expect(typeof result).toBe('string');
  });

  test.each(adversarialStrings)('output is always lowercase', (input) => {
    const result = normalize(input);
    expect(result).toBe(result.toLowerCase());
  });

  test.each(adversarialStrings)('output is always trimmed', (input) => {
    const result = normalize(input);
    expect(result).toBe(result.trim());
  });

  // Non-string inputs that are falsy (caught by || fallback)
  test.each([null, undefined, 0, false])('handles falsy non-string: %s', (input) => {
    expect(() => normalize(input)).not.toThrow();
    expect(typeof normalize(input)).toBe('string');
  });

  // Truthy non-strings (objects, arrays) — these crash normalize because || doesn't catch them.
  // This documents the current behavior as a known limitation.
  test.each([{}, []])('truthy non-string throws: %j', (input) => {
    expect(() => normalize(input)).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// buildRecipeLinks — never produces broken URLs
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildRecipeLinks — adversarial restaurant names', () => {
  test.each(adversarialStrings)('never throws for name: %s', (input) => {
    if (!input || !input.trim()) return; // skip empty — tested separately
    expect(() => buildRecipeLinks(input, 'dish')).not.toThrow();
  });

  test('URLs never contain literal "undefined"', () => {
    const links = buildRecipeLinks("McDonald's", undefined);
    for (const link of links) {
      expect(link.url).not.toContain('undefined');
    }
  });

  test('URLs never contain literal "null"', () => {
    const links = buildRecipeLinks("McDonald's", null);
    for (const link of links) {
      expect(link.url).not.toContain('null');
    }
  });

  test('handles emoji restaurant name', () => {
    const links = buildRecipeLinks('🍕 Pizza Palace', 'Pepperoni');
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link.url).toBeDefined();
      expect(link.url.length).toBeGreaterThan(0);
    }
  });

  test('handles special URL characters in dish name', () => {
    const links = buildRecipeLinks("Joe's", 'Mac & Cheese #1?');
    for (const link of links) {
      // Special chars should be encoded, not raw
      expect(link.url).not.toMatch(/[#?](?!.*=)/); // no raw # or ? in search terms
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// matchesExclude — handles weird inputs
// ═══════════════════════════════════════════════════════════════════════════════

describe('matchesExclude — adversarial exclude terms', () => {
  test('handles empty name and types gracefully', () => {
    expect(() => matchesExclude({}, ['test'])).not.toThrow();
    expect(() => matchesExclude({ name: null, types: null }, ['test'])).not.toThrow();
  });

  test('handles very long exclude term list', () => {
    const manyTerms = Array.from({ length: 1000 }, (_, i) => `term${i}`);
    expect(() => matchesExclude({ name: 'Restaurant', types: [] }, manyTerms)).not.toThrow();
  });

  test('handles emoji in exclude terms', () => {
    const result = matchesExclude({ name: '🍕 Pizza', types: [] }, ['🍕']);
    expect(result).toBe(true);
  });
});
