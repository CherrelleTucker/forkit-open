/* eslint-disable no-magic-numbers, sonarjs/no-duplicate-string -- test data uses literal values and repeated describe/expect names */
import {
  clamp,
  normalize,
  pickRandom,
  dollars,
  looksLikeChain,
  looksLikeChainByName,
  getSignatureDish,
  matchesExclude,
  getMinutesUntilClosing,
  getClosingSoonToast,
  buildRecipeLinks,
} from '../utils/helpers';

// ─── clamp ──────────────────────────────────────────────────────────────────

describe('clamp', () => {
  test('returns value when within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  test('clamps to min when value is below', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  test('clamps to max when value is above', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  test('returns min when min equals max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });

  test('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(0, -10, -1)).toBe(-1);
  });
});

// ─── normalize ──────────────────────────────────────────────────────────────

describe('normalize', () => {
  test('lowercases and trims', () => {
    expect(normalize('  Hello World  ')).toBe('hello world');
  });

  test('returns empty string for null', () => {
    expect(normalize(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(normalize(undefined)).toBe('');
  });

  test('returns empty string for empty string', () => {
    expect(normalize('')).toBe('');
  });

  test('returns empty string for zero', () => {
    expect(normalize(0)).toBe('');
  });

  test('handles already lowercase string', () => {
    expect(normalize('hello')).toBe('hello');
  });
});

// ─── pickRandom ─────────────────────────────────────────────────────────────

describe('pickRandom', () => {
  test('returns null for empty array', () => {
    expect(pickRandom([])).toBeNull();
  });

  test('returns null for null input', () => {
    expect(pickRandom(null)).toBeNull();
  });

  test('returns null for undefined input', () => {
    expect(pickRandom(undefined)).toBeNull();
  });

  test('returns the only element from single-element array', () => {
    expect(pickRandom(['only'])).toBe('only');
  });

  test('returns an element from the array', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = pickRandom(arr);
    expect(arr).toContain(result);
  });
});

// ─── dollars ────────────────────────────────────────────────────────────────

describe('dollars', () => {
  test('returns "Price —" for null', () => {
    expect(dollars(null)).toBe('Price —');
  });

  test('returns "Price —" for 0', () => {
    expect(dollars(0)).toBe('Price —');
  });

  test('returns "Price —" for negative', () => {
    expect(dollars(-1)).toBe('Price —');
  });

  test('returns "$" for price level 1', () => {
    expect(dollars(1)).toBe('$');
  });

  test('returns "$$" for price level 2', () => {
    expect(dollars(2)).toBe('$$');
  });

  test('returns "$$$" for price level 3', () => {
    expect(dollars(3)).toBe('$$$');
  });

  test('returns "$$$$" for price level 4', () => {
    expect(dollars(4)).toBe('$$$$');
  });

  test('returns "Price —" for undefined', () => {
    expect(dollars(undefined)).toBe('Price —');
  });
});

// ─── looksLikeChain ────────────────────────────────────────────────────────

describe('looksLikeChain', () => {
  test('detects chain by keyword AND high reviews (mcdonald + 500)', () => {
    expect(looksLikeChain("McDonald's", 500)).toBe(true);
  });

  test('detects chain by keyword AND high reviews (starbucks + 1000)', () => {
    expect(looksLikeChain('Starbucks Coffee', 1000)).toBe(true);
  });

  test('returns false for keyword match with low reviews (AND logic)', () => {
    expect(looksLikeChain("McDonald's", 100)).toBe(false);
  });

  test('returns false for high reviews without keyword match (AND logic)', () => {
    expect(looksLikeChain('Random Place', 500)).toBe(false);
  });

  test('returns false for local restaurant with low reviews', () => {
    expect(looksLikeChain("Joe's BBQ Shack", 50)).toBe(false);
  });

  test('returns false with no review count', () => {
    expect(looksLikeChain("Mom's Kitchen")).toBe(false);
  });

  test('returns false for null review count and non-chain name', () => {
    expect(looksLikeChain('Local Sushi', null)).toBe(false);
  });

  test('returns false for 499 reviews and non-chain name', () => {
    expect(looksLikeChain('Neighborhood Bistro', 499)).toBe(false);
  });
});

// ─── looksLikeChainByName ───────────────────────────────────────────────────

describe('looksLikeChainByName', () => {
  test('detects chain by name only (no review count needed)', () => {
    expect(looksLikeChainByName("McDonald's")).toBe(true);
  });

  test('detects chain by name even with low reviews (not checked)', () => {
    expect(looksLikeChainByName('Starbucks Coffee')).toBe(true);
  });

  test('detects newly added chain (Hunt Brothers Pizza)', () => {
    expect(looksLikeChainByName('Hunt Brothers Pizza')).toBe(true);
  });

  test('detects newly added chain (standalone CAVA)', () => {
    expect(looksLikeChainByName('CAVA')).toBe(true);
  });

  test('detects newly added chain (Del Taco)', () => {
    expect(looksLikeChainByName('Del Taco #4521')).toBe(true);
  });

  test('detects tightened chain (Baskin-Robbins)', () => {
    expect(looksLikeChainByName('Baskin-Robbins')).toBe(true);
  });

  test("detects tightened chain (Morton's The Steakhouse)", () => {
    expect(looksLikeChainByName("Morton's The Steakhouse")).toBe(true);
  });

  test('returns false for non-chain name', () => {
    expect(looksLikeChainByName("Joe's BBQ Shack")).toBe(false);
  });

  test('returns false for local restaurant', () => {
    expect(looksLikeChainByName('Neighborhood Bistro')).toBe(false);
  });

  // Regression: tightened keywords must NOT catch surname/substring false positives
  test('does not catch Morton surname (Morton Street Deli)', () => {
    expect(looksLikeChainByName('Morton Street Deli')).toBe(false);
  });

  test('does not catch Perkins surname (Mrs. Perkins Bakery)', () => {
    expect(looksLikeChainByName('Mrs. Perkins Bakery')).toBe(false);
  });

  test("does not catch Peet substring (Peete's Diner)", () => {
    expect(looksLikeChainByName("Peete's Diner")).toBe(false);
  });

  test('does not catch Baskin surname (Baskin Family Grill)', () => {
    expect(looksLikeChainByName('Baskin Family Grill')).toBe(false);
  });

  test('does not catch plain "Cook Out" phrase (Mary\'s Cook Out BBQ)', () => {
    expect(looksLikeChainByName("Mary's Cook Out BBQ")).toBe(false);
  });
});

// ─── getSignatureDish ───────────────────────────────────────────────────────

describe('getSignatureDish', () => {
  test('returns Big Mac for McDonalds', () => {
    expect(getSignatureDish("McDonald's")).toBe('Big Mac');
  });

  test('returns Crunchwrap Supreme for Taco Bell', () => {
    expect(getSignatureDish('Taco Bell')).toBe('Crunchwrap Supreme');
  });

  test('returns Chick-fil-A Chicken Sandwich for Chick-fil-A', () => {
    expect(getSignatureDish('Chick-fil-A')).toBe('Chick-fil-A Chicken Sandwich');
  });

  test('returns Chick-fil-A Chicken Sandwich for chickfila variant', () => {
    expect(getSignatureDish('Chickfila Downtown')).toBe('Chick-fil-A Chicken Sandwich');
  });

  test('returns Signature dish for unknown restaurant', () => {
    expect(getSignatureDish("Joe's BBQ")).toBe('Signature dish');
  });

  test('handles case-insensitive matching', () => {
    expect(getSignatureDish('CHIPOTLE MEXICAN GRILL')).toBe('Chicken Burrito Bowl');
  });
});

// ─── matchesExclude ─────────────────────────────────────────────────────────

describe('matchesExclude', () => {
  test('returns false for empty exclude terms', () => {
    expect(matchesExclude({ name: 'Taco Place', types: ['restaurant'] }, [])).toBe(false);
  });

  test('matches by name', () => {
    expect(matchesExclude({ name: 'Taco Bell Express', types: [] }, ['taco bell'])).toBe(true);
  });

  test('matches by type', () => {
    expect(matchesExclude({ name: 'Good Food', types: ['bar', 'restaurant'] }, ['bar'])).toBe(true);
  });

  test('does not match when no terms hit', () => {
    expect(
      matchesExclude({ name: 'Italian Bistro', types: ['restaurant'] }, ['sushi', 'thai']),
    ).toBe(false);
  });

  test('handles restaurant with no name', () => {
    expect(matchesExclude({ types: ['cafe'] }, ['cafe'])).toBe(true);
  });

  test('handles restaurant with no types', () => {
    expect(matchesExclude({ name: 'Sushi Place' }, ['sushi'])).toBe(true);
  });
});

// ─── getMinutesUntilClosing ─────────────────────────────────────────────────

describe('getMinutesUntilClosing', () => {
  test('returns null for null input', () => {
    expect(getMinutesUntilClosing(null)).toBeNull();
  });

  test('returns null for undefined input', () => {
    expect(getMinutesUntilClosing(undefined)).toBeNull();
  });

  test('returns null for empty periods', () => {
    expect(getMinutesUntilClosing({ periods: [] })).toBeNull();
  });

  test('returns minutes until closing for same-day period', () => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    // Set close time 45 minutes from now
    const closeMinutes = currentMinutes + 45;
    const closeHour = Math.floor(closeMinutes / 60);
    const closeMinute = closeMinutes % 60;

    if (closeHour < 24) {
      const result = getMinutesUntilClosing({
        periods: [
          {
            close: { day: currentDay, hour: closeHour, minute: closeMinute },
          },
        ],
      });
      expect(result).toBe(45);
    }
  });

  test('returns null when no matching period for today', () => {
    const now = new Date();
    const differentDay = (now.getDay() + 3) % 7;
    expect(
      getMinutesUntilClosing({
        periods: [{ close: { day: differentDay, hour: 22, minute: 0 } }],
      }),
    ).toBeNull();
  });
});

// ─── getClosingSoonToast ────────────────────────────────────────────────────

describe('getClosingSoonToast', () => {
  test('returns null when closingMins is null', () => {
    expect(getClosingSoonToast(null, 'drive', 3)).toBeNull();
  });

  test('returns null when closingMins exceeds warning threshold (>60)', () => {
    expect(getClosingSoonToast(61, 'drive', 3)).toBeNull();
  });

  test('returns "Get walking!" for walk mode within close radius', () => {
    expect(getClosingSoonToast(30, 'walk', 0.25)).toBe('Get walking!');
  });

  test('returns "Better hurry!" for walk mode beyond close radius', () => {
    expect(getClosingSoonToast(30, 'walk', 1.0)).toBe('Better hurry!');
  });

  test('returns "Drive safely!" for drive mode', () => {
    expect(getClosingSoonToast(30, 'drive', 5)).toBe('Drive safely!');
  });

  test('returns toast at exactly 60 minutes', () => {
    expect(getClosingSoonToast(60, 'drive', 3)).toBe('Drive safely!');
  });

  test('returns "Get walking!" at exactly WALK_CLOSE_RADIUS (0.25)', () => {
    expect(getClosingSoonToast(10, 'walk', 0.25)).toBe('Get walking!');
  });
});

// ─── buildRecipeLinks ───────────────────────────────────────────────────────

describe('buildRecipeLinks', () => {
  test('returns 3 links (YouTube, Google, Allrecipes)', () => {
    const links = buildRecipeLinks("McDonald's", 'Big Mac');
    expect(links).toHaveLength(3);
    expect(links[0].label).toBe('YouTube');
    expect(links[1].label).toBe('Google');
    expect(links[2].label).toBe('Allrecipes');
  });

  test('includes restaurant name and dish in URLs', () => {
    const links = buildRecipeLinks("McDonald's", 'Big Mac');
    expect(links[0].url).toContain('McDonald');
    expect(links[0].url).toContain('Big%20Mac');
    expect(links[0].url).toContain('copycat%20recipe');
  });

  test('uses restaurant name only when no dish', () => {
    const links = buildRecipeLinks("Joe's BBQ");
    // When dishName is falsy, searchTerm = restaurantName
    expect(links[0].url).toContain("Joe's%20BBQ");
    expect(links[0].url).toContain('copycat%20recipe');
  });

  test('Allrecipes uses dishName only (not restaurant)', () => {
    const links = buildRecipeLinks("McDonald's", 'Big Mac');
    // qDish = encodeURIComponent("Big Mac copycat recipe")
    expect(links[2].url).toContain('Big%20Mac%20copycat%20recipe');
  });

  test('each link has label, icon, and url', () => {
    const links = buildRecipeLinks('Test', 'Dish');
    for (const link of links) {
      expect(link).toHaveProperty('label');
      expect(link).toHaveProperty('icon');
      expect(link).toHaveProperty('url');
    }
  });
});
