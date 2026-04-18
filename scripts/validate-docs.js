#!/usr/bin/env node
// ForkIt — Documentation & content consistency checker
// Scans all non-code files for stale references that don't match the current app state.
// Run: node scripts/validate-docs.js

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
let errors = 0;
let warnings = 0;

function error(msg) {
  errors++;
  console.log(`  ERROR: ${msg}`);
}
function warn(msg) {
  warnings++;
  console.log(`  WARN:  ${msg}`);
}

// ── Current source of truth (update these when the app changes) ──

const TRUTH = {
  freeTier: { searches: 10, sessions: 1 },
  proPrice: '$1.99',
  proPlusPrice: '$2.99',
  proAnnualPrice: '$14.99',
  proPlusAnnualPrice: '$24.99',
  // Terms that should NOT appear in user-facing docs (removed in V4)
  removedTerms: [
    'clerk',
    'neon.*database',
    'neon.*serverless',
    'revenueCat',
    'react-native-purchases',
    'cloud sync',
    'sign.in with apple',
    'sign.in with google',
  ],
  // Patterns that indicate stale pricing
  stalePricing: ['\\$4\\.99.*month', '\\$4\\.99/mo', 'Pro\\+.*\\$4'],
  // Free tier count that's wrong — must be adjacent (free tier: 20, free: 20, 20 free)
  staleFreeCount: ['free.{0,15}20 search', 'free.{0,15}20 pick', '20 free search', '20 free pick'],
};

// ── Files to scan ──

const SCAN_PATTERNS = [
  // User-facing web content
  'web/public/index.html',
  'web/public/privacy.html',
  'web/public/terms.html',
  'web/public/group/index.html',
  // GitHub Pages
  'docs/privacy.html',
  'docs/terms.html',
  'docs/index.html',
  // Repo docs
  'README.md',
  'CHANGELOG.md',
  'ROADMAP.md',
  'PRIVACY_POLICY.md',
  // App config
  'app.json',
  'constants/config.js',
  'constants/content.js',
];

// Files where removed terms are OK (historical narrative, credentials archive, planning docs)
const HISTORICAL_FILES = [
  'CHANGELOG.md',
  'CREDENTIALS.md',
  'DEV-LOG.md',
  'ROADMAP.md',
  'docs/v4-implementation-plan.md',
  'prd.md',
];

function isHistorical(filePath) {
  return HISTORICAL_FILES.some((h) => filePath.endsWith(h));
}

// ── Scanning ──

console.log('\n── ForkIt Doc Consistency Check ──\n');

for (const relPath of SCAN_PATTERNS) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    warn(`${relPath} — file not found`);
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const rel = relPath;

  // Check for removed terms (only error in non-historical files)
  if (!isHistorical(relPath)) {
    for (const term of TRUTH.removedTerms) {
      for (let i = 0; i < lines.length; i++) {
        if (new RegExp(term, 'i').test(lines[i])) {
          // Skip if it's clearly describing removal ("removed", "replaced", "no longer")
          const line = lines[i].toLowerCase();
          if (/removed|replaced|no longer|decommission|was used|formerly/i.test(line)) continue;
          error(
            `${rel}:${i + 1} — contains removed V3 term "${term}": ${lines[i].trim().slice(0, 80)}`,
          );
        }
      }
    }
  }

  // Check for stale pricing (skip historical files)
  if (!isHistorical(relPath)) {
    for (const pattern of TRUTH.stalePricing) {
      for (let i = 0; i < lines.length; i++) {
        if (new RegExp(pattern, 'i').test(lines[i])) {
          // Skip lines describing historical context
          if (/was |were |from |previously|v3|changed/i.test(lines[i])) continue;
          error(`${rel}:${i + 1} — stale pricing: ${lines[i].trim().slice(0, 80)}`);
        }
      }
    }
  }

  // Check for stale free tier counts (skip historical files)
  if (!isHistorical(relPath)) {
    for (const pattern of TRUTH.staleFreeCount) {
      for (let i = 0; i < lines.length; i++) {
        if (new RegExp(pattern, 'i').test(lines[i])) {
          error(`${rel}:${i + 1} — stale free tier count: ${lines[i].trim().slice(0, 80)}`);
        }
      }
    }
  }
}

// ── Check for env files with removed service keys ──

console.log('\n── Env File Check ──\n');

const envFiles = ['.env.example'];

const removedEnvKeys = [
  'CLERK_SECRET_KEY',
  'DATABASE_URL',
  'REVENUECAT_API_KEY',
  'REVENUECAT_PROJECT_ID',
  'PROMO_CODES',
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
];

for (const relPath of envFiles) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf8');
  for (const key of removedEnvKeys) {
    if (content.includes(key)) {
      error(`${relPath} — contains removed env var: ${key}`);
    }
  }
}
console.log('  OK');

// ── Summary ──

console.log(`\n════════════════════════════════════`);
if (errors === 0) {
  console.log(`PASSED${warnings > 0 ? ` with ${warnings} warning(s)` : ''}`);
} else {
  console.log(`FAILED: ${errors} error(s), ${warnings} warning(s)`);
}

process.exit(errors > 0 ? 1 : 0);
