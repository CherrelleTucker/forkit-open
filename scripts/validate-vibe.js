#!/usr/bin/env node
/**
 * Vibe Code Validator — catches common AI coding assistant mistakes.
 *
 * Checks:
 *  1. EAS env var consistency across build profiles
 *  2. Phantom npm imports (packages not in package.json)
 *  3. Phantom file imports (relative imports to nonexistent files)
 *  4. Orphan asset references in app.json
 *  5. Hallucinated API routes (fetch calls to nonexistent backend endpoints)
 *  6. Hardcoded localhost / private IPs in source
 *  7. Unfinished stubs (TODO / FIXME / HACK markers)
 *  8. StyleSheet hallucinations (defined↔referenced mismatch)
 *  9. Web-isms in React Native (onClick, className, div, span, etc.)
 * 10. Dead state variables (useState declared but value never read)
 * 11. Duplicate function definitions
 * 12. Permission–code mismatch (declared vs actually used)
 * 13. IAP / Subscription compliance
 * 14. Paywall & entitlement logic
 * 15. Cross-file prop consistency (destructured props must be passed)
 * 16. Cross-file style references (styles.xxx must have a source)
 * 17. Circular dependency detection
 * 18. Orphan exports (exported but never imported)
 */

const fs = require('fs');
const path = require('path');
const { builtinModules } = require('module');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

let errors = 0;
let warnings = 0;

function error(check, msg) {
  console.error(`  ERROR [${check}]: ${msg}`);
  errors++;
}

function warn(check, msg) {
  console.warn(`  WARN  [${check}]: ${msg}`);
  warnings++;
}

function heading(n, label) {
  console.log(`\n── ${n}. ${label} ──`);
}

/** Recursively collect .js/.jsx files, skipping node_modules, dotfiles, and this script. */
function collectJsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip the scripts directory (contains this validator and other tooling)
      if (entry.name === 'scripts' || entry.name === 'dist' || entry.name === 'coverage') continue;
      results.push(...collectJsFiles(full));
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/** Extract the npm package name from an import specifier (handles scoped pkgs). */
function pkgName(specifier) {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split('/')[0];
}

const jsFiles = collectJsFiles(ROOT);
const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

// Node builtin modules (with and without 'node:' prefix)
const builtins = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);

// ─────────────────────────────────────────────────────────────────────────────
// 1. EAS env var consistency
// ─────────────────────────────────────────────────────────────────────────────
heading(1, 'EAS env var consistency');

const easPath = path.join(ROOT, 'eas.json');
if (fs.existsSync(easPath)) {
  const eas = JSON.parse(fs.readFileSync(easPath, 'utf8'));
  const profiles = eas.build || {};

  const distProfiles = Object.entries(profiles).filter(
    ([name]) => !name.includes('development') && !name.includes('simulator'),
  );

  // Collect EXPO_PUBLIC_* keys across distributable profiles
  const allEnvKeys = new Set();
  for (const [, config] of distProfiles) {
    for (const key of Object.keys(config.env || {})) {
      if (key.startsWith('EXPO_PUBLIC_')) allEnvKeys.add(key);
    }
  }

  for (const envKey of allEnvKeys) {
    for (const [name, config] of distProfiles) {
      if (!(config.env && config.env[envKey])) {
        error(1, `eas.json profile "${name}" missing ${envKey}`);
      }
    }
  }

  // Localhost fallback check
  const appJsPath = path.join(ROOT, 'App.js');
  if (fs.existsSync(appJsPath)) {
    const appSource = fs.readFileSync(appJsPath, 'utf8');
    const fallbacks = [
      ...appSource.matchAll(/process\.env\.(\w+)\s*\|\|\s*['"]http:\/\/localhost/g),
    ];
    for (const match of fallbacks) {
      const varName = match[1];
      for (const [name, config] of distProfiles) {
        if (!(config.env && config.env[varName])) {
          error(
            1,
            `App.js falls back to localhost for ${varName} but profile "${name}" doesn't set it`,
          );
        }
      }
    }
  }

  if (errors === 0) console.log('  OK');
} else {
  console.log('  SKIP (no eas.json)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Phantom npm imports
// ─────────────────────────────────────────────────────────────────────────────
heading(2, 'Phantom npm imports');

const errsBefore2 = errors;

// Match: import ... from 'pkg'  |  require('pkg')  |  import('pkg')
const importPatterns = [
  /from\s+['"]([^.\/][^'"]*)['"]/g,
  /require\(\s*['"]([^.\/][^'"]*)['"]\s*\)/g,
  /import\(\s*['"]([^.\/][^'"]*)['"]\s*\)/g,
];

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);

  for (const pattern of importPatterns) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(source)) !== null) {
      const specifier = m[1];
      const name = pkgName(specifier);

      if (builtins.has(name)) continue;
      if (name === 'react-native') continue; // provided by expo runtime

      if (!allDeps[name]) {
        error(2, `${rel} imports "${name}" but it's not in package.json`);
      }
    }
  }
}

if (errors === errsBefore2) console.log('  OK');

// ─────────────────────────────────────────────────────────────────────────────
// 3. Phantom file imports
// ─────────────────────────────────────────────────────────────────────────────
heading(3, 'Phantom file imports');

const errsBefore3 = errors;
const relImportPattern = /(?:from|require\()\s*['"](\.[^'"]+)['"]/g;
const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx'];

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  const rel = path.relative(ROOT, file);

  relImportPattern.lastIndex = 0;
  let m;
  while ((m = relImportPattern.exec(source)) !== null) {
    const specifier = m[1];
    const base = path.resolve(dir, specifier);

    const found = extensions.some((ext) => fs.existsSync(base + ext));
    if (!found) {
      error(3, `${rel} imports "${specifier}" but file not found`);
    }
  }
}

if (errors === errsBefore3) console.log('  OK');

// ─────────────────────────────────────────────────────────────────────────────
// 4. Orphan asset references in app.json
// ─────────────────────────────────────────────────────────────────────────────
heading(4, 'Orphan asset references');

const errsBefore4 = errors;
const appJsonPath = path.join(ROOT, 'app.json');

if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

  /** Recursively find string values that look like local file paths. */
  function findAssetPaths(obj, keyPath) {
    const paths = [];
    if (typeof obj === 'string' && obj.startsWith('./')) {
      paths.push({ keyPath, value: obj });
    } else if (Array.isArray(obj)) {
      obj.forEach((item, i) => paths.push(...findAssetPaths(item, `${keyPath}[${i}]`)));
    } else if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        paths.push(...findAssetPaths(v, keyPath ? `${keyPath}.${k}` : k));
      }
    }
    return paths;
  }

  const assetRefs = findAssetPaths(appJson, '');

  for (const { keyPath, value } of assetRefs) {
    // Skip URL-like values and permission strings
    if (value.startsWith('http')) continue;

    const resolved = path.resolve(ROOT, value);
    if (!fs.existsSync(resolved)) {
      error(4, `app.json ${keyPath} references "${value}" but file not found`);
    }
  }

  if (errors === errsBefore4) console.log('  OK');
} else {
  console.log('  SKIP (no app.json)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Hallucinated API routes
// ─────────────────────────────────────────────────────────────────────────────
heading(5, 'Hallucinated API routes');

const errsBefore5 = errors;

// Try common backend locations
const backendCandidates = [
  path.join(ROOT, '..', 'forkit-backend', 'api'),
  path.join(ROOT, '..', 'backend', 'api'),
  path.join(ROOT, '..', 'api'),
  path.join(ROOT, 'api'),
];

const backendDir = backendCandidates.find((d) => fs.existsSync(d) && fs.statSync(d).isDirectory());

if (backendDir) {
  // Match: fetch(`${BACKEND_URL}/api/some-route` or fetch(BACKEND_URL + '/api/...')
  const routePattern = /fetch\(\s*[`'"]?\$\{[^}]+\}\/api\/([a-z0-9-]+)/g;

  const backendFiles = fs.readdirSync(backendDir).map((f) => path.parse(f).name);

  for (const file of jsFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file);

    routePattern.lastIndex = 0;
    let m;
    while ((m = routePattern.exec(source)) !== null) {
      const route = m[1];
      if (!backendFiles.includes(route)) {
        error(5, `${rel} calls /api/${route} but no ${route}.js found in backend`);
      }
    }
  }

  if (errors === errsBefore5) console.log('  OK');
} else {
  console.log('  SKIP (backend directory not found)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Hardcoded localhost / private IPs
// ─────────────────────────────────────────────────────────────────────────────
heading(6, 'Hardcoded localhost / private IPs');

const errsBefore6 = errors;
const localhostPatterns = [
  /['"`]https?:\/\/localhost[:\d/'"` ]/g,
  /['"`]https?:\/\/127\.0\.0\.1[:\d/'"` ]/g,
  /['"`]https?:\/\/0\.0\.0\.0[:\d/'"` ]/g,
  /['"`]https?:\/\/192\.168\.\d/g,
  /['"`]https?:\/\/10\.0\.\d/g,
];

// Lines that are env-var fallbacks are covered by check 1 — skip them
const envFallbackPattern = /process\.env\.\w+\s*\|\|/;

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comment lines
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    // Skip env-var fallback lines (already validated by check 1)
    if (envFallbackPattern.test(line)) continue;

    for (const pattern of localhostPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        error(6, `${rel}:${i + 1} contains hardcoded localhost/private IP`);
      }
    }
  }
}

if (errors === errsBefore6) console.log('  OK');

// ─────────────────────────────────────────────────────────────────────────────
// 7. Unfinished stubs (TODO / FIXME / HACK)
// ─────────────────────────────────────────────────────────────────────────────
heading(7, 'Unfinished stubs');

const warnsBefore7 = warnings;
const stubPattern = /\b(TODO|FIXME|HACK|XXX)\b[:\s]/gi;

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    stubPattern.lastIndex = 0;
    const m = stubPattern.exec(lines[i]);
    if (m) {
      warn(7, `${rel}:${i + 1} — ${m[1]}: ${lines[i].trim().slice(0, 80)}`);
    }
  }
}

if (warnings === warnsBefore7) console.log('  OK');

// ─────────────────────────────────────────────────────────────────────────────
// 8. StyleSheet hallucinations
// ─────────────────────────────────────────────────────────────────────────────
heading(8, 'StyleSheet hallucinations');

const errsBefore8 = errors;

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);

  // Find all StyleSheet.create({...}) blocks and extract defined style names.
  // Style names are at the top level of the object (e.g., "container", "header").
  // We identify them by matching keys followed by { or a value on the same line,
  // using exactly 2 spaces indent (the convention for top-level keys).
  const sheetMatches = [...source.matchAll(/StyleSheet\.create\(\{([\s\S]*?)\n\}\)/g)];
  if (sheetMatches.length === 0) continue;

  const definedStyles = new Set();
  for (const sm of sheetMatches) {
    const block = sm[1];
    // Match top-level style names: lines starting with exactly 2 spaces + word + colon
    // This excludes nested CSS properties (4+ spaces) like "color:", "fontSize:", etc.
    for (const km of block.matchAll(/^\s{2}(\w+)\s*:/gm)) {
      // Skip common CSS property names that could appear at any indent
      const name = km[1];
      const cssProps = new Set([
        'color',
        'fontSize',
        'fontFamily',
        'fontWeight',
        'letterSpacing',
        'lineHeight',
        'position',
        'top',
        'left',
        'right',
        'bottom',
        'zIndex',
        'alignItems',
        'alignSelf',
        'justifyContent',
        'flexDirection',
        'flex',
        'flexShrink',
        'flexGrow',
        'flexWrap',
        'gap',
        'padding',
        'paddingTop',
        'paddingBottom',
        'paddingLeft',
        'paddingRight',
        'paddingVertical',
        'paddingHorizontal',
        'margin',
        'marginTop',
        'marginBottom',
        'marginLeft',
        'marginRight',
        'marginVertical',
        'marginHorizontal',
        'borderRadius',
        'borderTopLeftRadius',
        'borderTopRightRadius',
        'borderBottomLeftRadius',
        'borderBottomRightRadius',
        'backgroundColor',
        'borderWidth',
        'borderColor',
        'borderTopWidth',
        'borderTopColor',
        'borderBottomWidth',
        'borderBottomColor',
        'borderLeftWidth',
        'borderLeftColor',
        'borderRightWidth',
        'borderRightColor',
        'shadowColor',
        'shadowOpacity',
        'shadowRadius',
        'shadowOffset',
        'elevation',
        'overflow',
        'textAlign',
        'textDecorationLine',
        'textTransform',
        'width',
        'height',
        'minWidth',
        'minHeight',
        'maxWidth',
        'maxHeight',
        'opacity',
        'transform',
        'display',
        'resizeMode',
      ]);
      if (!cssProps.has(name)) {
        definedStyles.add(name);
      }
    }
  }

  // Find all styles.xxx references in the file
  const referencedStyles = new Set();
  for (const rm of source.matchAll(/styles\.(\w+)/g)) {
    referencedStyles.add(rm[1]);
  }

  // Check for references to undefined styles
  for (const ref of referencedStyles) {
    if (!definedStyles.has(ref)) {
      error(8, `${rel} references styles.${ref} but it's not defined in StyleSheet.create()`);
    }
  }

  // Check for defined but unreferenced styles (warn, not error — could be dynamic)
  for (const def of definedStyles) {
    if (!referencedStyles.has(def)) {
      warn(8, `${rel} defines style "${def}" but it's never referenced`);
    }
  }
}

if (errors === errsBefore8) console.log('  OK');

// ─────────────────────────────────────────────────────────────────────────────
// 9. Web-isms in React Native
// ─────────────────────────────────────────────────────────────────────────────
heading(9, 'Web-isms in React Native');

const errsBefore9 = errors;

// Patterns that indicate web React code pasted into React Native
const webPatterns = [
  { pattern: /\bonClick\s*[={]/g, label: 'onClick (use onPress)' },
  { pattern: /\bclassName\s*[={]/g, label: 'className (use style)' },
  { pattern: /\bhtmlFor\s*[={]/g, label: 'htmlFor (not in RN)' },
  { pattern: /<div[\s>]/g, label: '<div> (use <View>)' },
  { pattern: /<span[\s>]/g, label: '<span> (use <Text>)' },
  { pattern: /<img[\s>]/g, label: '<img> (use <Image>)' },
  { pattern: /<input[\s>]/g, label: '<input> (use <TextInput>)' },
  { pattern: /<button[\s>]/g, label: '<button> (use <TouchableOpacity>)' },
  { pattern: /<a\s+href/g, label: '<a href> (use Linking.openURL)' },
  { pattern: /document\.(get|query|create)/g, label: 'DOM API (not available in RN)' },
  { pattern: /window\.(add|remove)EventListener/g, label: 'window events (use RN APIs)' },
];

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  const lines = source.split('\n');

  // Skip platform utility files that intentionally use web APIs behind Platform.OS checks
  if (rel.includes('utils/platform') || rel.includes('utils/location')) continue;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    // Skip lines with Platform.OS checks (intentional web-specific code)
    if (/Platform\.OS/.test(line)) continue;

    for (const { pattern, label } of webPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        error(9, `${rel}:${i + 1} uses ${label}`);
      }
    }
  }
}

if (errors === errsBefore9) console.log('  OK');

// ─────────────────────────────────────────────────────────────────────────────
// 10. Dead state variables
// ─────────────────────────────────────────────────────────────────────────────
heading(10, 'Dead state variables');

const warnsBefore10 = warnings;

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);

  // Find all useState declarations: const [value, setValue] = useState(...)
  const stateDecls = [...source.matchAll(/const\s+\[(\w+),\s*set(\w+)\]\s*=\s*useState/g)];

  for (const decl of stateDecls) {
    const valueName = decl[1];
    const setterName = `set${decl[2]}`;

    // Count occurrences of the value name (excluding the declaration line itself)
    // We need word-boundary matches to avoid false positives (e.g., "loading" inside "isLoading")
    const valueRegex = new RegExp(`\\b${valueName}\\b`, 'g');
    const valueMatches = [...source.matchAll(valueRegex)];
    // Subtract 1 for the declaration itself
    const valueUses = valueMatches.length - 1;

    if (valueUses === 0) {
      warn(10, `${rel} — "${valueName}" (useState) is never read`);
    }

    // Check if setter is ever called
    const setterRegex = new RegExp(`\\b${setterName}\\b`, 'g');
    const setterMatches = [...source.matchAll(setterRegex)];
    // Subtract 1 for the declaration itself
    const setterUses = setterMatches.length - 1;

    if (setterUses === 0) {
      warn(10, `${rel} — "${setterName}" (useState setter) is never called`);
    }
  }
}

if (warnings === warnsBefore10) console.log('  OK');

// ─────────────────────────────────────────────────────────────────────────────
// 11. Duplicate function definitions
// ─────────────────────────────────────────────────────────────────────────────
heading(11, 'Duplicate function definitions');

const errsBefore11 = errors;

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);

  // Only flag top-level / module-level duplicates (no leading whitespace).
  // Functions defined inside closures (indented) can legitimately share names
  // across different scopes.
  const funcDefs = [
    ...source.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/gm),
    ...source.matchAll(/^const\s+(\w+)\s*=\s*(?:async\s+)?\(/gm),
    ...source.matchAll(/^const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>/gm),
  ];

  // Deduplicate matches (a single definition can match multiple patterns)
  const deduped = new Map(); // "name:line" -> { name, line }
  for (const fm of funcDefs) {
    const name = fm[1];
    const line = source.slice(0, fm.index).split('\n').length;
    const key = `${name}:${line}`;
    if (!deduped.has(key)) deduped.set(key, { name, line });
  }

  const seen = new Map(); // name -> first line
  for (const { name, line } of deduped.values()) {
    if (seen.has(name)) {
      error(11, `${rel}:${line} — "${name}" already defined at line ${seen.get(name)}`);
    } else {
      seen.set(name, line);
    }
  }
}

if (errors === errsBefore11) console.log('  OK');

// ─────────────────────────────────────────────────────────────────────────────
// 12. Permission–code mismatch
// ─────────────────────────────────────────────────────────────────────────────
heading(12, 'Permission-code mismatch');

const errsBefore12 = errors;

if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const expo = appJson.expo || appJson;
  const androidPerms = new Set((expo.android && expo.android.permissions) || []);
  const plugins = (expo.plugins || []).map((p) => (Array.isArray(p) ? p[0] : p));

  // Combine all JS source for checking
  const allSource = jsFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

  // Map of: API usage pattern -> required permission/plugin
  const permChecks = [
    {
      api: /expo-location|requestLocationPermission|getCurrentPosition/,
      perm: () => plugins.includes('expo-location') || androidPerms.has('ACCESS_FINE_LOCATION'),
      label: 'Location APIs used but expo-location plugin or ACCESS_FINE_LOCATION not declared',
    },
    {
      api: /expo-camera|Camera\.request/,
      perm: () => plugins.includes('expo-camera') || androidPerms.has('CAMERA'),
      label: 'Camera APIs used but expo-camera plugin or CAMERA permission not declared',
    },
    {
      api: /expo-contacts|Contacts\.request/,
      perm: () => plugins.includes('expo-contacts') || androidPerms.has('READ_CONTACTS'),
      label: 'Contacts APIs used but expo-contacts plugin or READ_CONTACTS not declared',
    },
    {
      api: /expo-notifications|Notifications\.request/,
      perm: () => plugins.includes('expo-notifications'),
      label: 'Notification APIs used but expo-notifications plugin not declared',
    },
    {
      api: /expo-media-library|MediaLibrary\.request/,
      perm: () =>
        plugins.includes('expo-media-library') || androidPerms.has('READ_EXTERNAL_STORAGE'),
      label: 'Media library APIs used but expo-media-library plugin not declared',
    },
  ];

  for (const check of permChecks) {
    if (check.api.test(allSource) && !check.perm()) {
      error(12, check.label);
    }
  }

  if (errors === errsBefore12) console.log('  OK');
} else {
  console.log('  SKIP (no app.json)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. IAP / Subscription compliance
// ─────────────────────────────────────────────────────────────────────────────
heading(13, 'IAP / Subscription compliance');

const errsBefore13 = errors;

if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const expo = appJson.expo || appJson;
  const allSource = jsFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

  const hasIAPImport = /react-native-iap/.test(allSource);
  const hasBillingPerm =
    expo.android &&
    expo.android.permissions &&
    expo.android.permissions.includes('com.android.vending.BILLING');

  if (hasIAPImport) {
    // react-native-iap uses autolinking — Android billing permission must exist
    if (!hasBillingPerm) {
      error(13, 'react-native-iap used but com.android.vending.BILLING not in Android permissions');
    }
    // IAP init must be guarded against web
    const initPattern = /initConnection/;
    if (initPattern.test(allSource)) {
      for (const file of jsFiles) {
        const source = fs.readFileSync(file, 'utf8');
        const lines = source.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (/initConnection\(/.test(lines[i])) {
            // Widened to 30 lines so the Platform.OS guard at the enclosing
            // useEffect scope is visible (typical layout: guard near hook entry,
            // retry helpers defined inside, initConnection called deep).
            const context = lines.slice(Math.max(0, i - 30), i + 1).join('\n');
            if (
              !/Platform\.OS/.test(context) &&
              !/!== ['"]web['"]/.test(context) &&
              !/web/.test(context)
            ) {
              error(
                13,
                `${path.relative(ROOT, file)}:${i + 1} — initConnection without Platform.OS web guard`,
              );
            }
          }
        }
      }
    }

    // Must have restore purchases call
    if (!/getAvailablePurchases|restorePurchase/.test(allSource)) {
      error(13, 'No restore purchases call found — Apple requires a Restore Purchases button');
    }

    // Must have auto-renewal disclosure text
    if (!/auto-renew|Auto-renew|cancel anytime|Cancel anytime/i.test(allSource)) {
      error(13, 'No auto-renewal disclosure text found — required by Apple/Google');
    }

    // Verify IAP imports resolve to real exports in the installed module.
    // react-native-iap v14 silently renamed APIs — old names import as undefined
    // with no build error. Only runtime crashes reveal the problem.
    // Uses static analysis (reading the module's source for export declarations)
    // because react-native-iap can't be required outside of React Native.
    const iapIndexPath = path.join(
      ROOT,
      'node_modules',
      'react-native-iap',
      'lib',
      'module',
      'index.js',
    );
    const iapTypesPath = path.join(
      ROOT,
      'node_modules',
      'react-native-iap',
      'lib',
      'typescript',
      'module',
      'src',
      'index.d.ts',
    );
    const iapSourcePath = [iapTypesPath, iapIndexPath].find((p) => fs.existsSync(p));
    if (iapSourcePath) {
      const iapSource = fs.readFileSync(iapSourcePath, 'utf8');
      // Collect all named exports from the module source
      const exportedNames = new Set();
      const exportPatterns = [
        /export\s+(?:const|function|class|let|var|async\s+function)\s+(\w+)/g,
        /export\s*\{\s*([^}]+)\}/g,
      ];
      for (const pat of exportPatterns) {
        let m;
        while ((m = pat.exec(iapSource)) !== null) {
          if (pat.source.includes('{')) {
            m[1].split(',').forEach((n) => {
              const clean = n
                .trim()
                .split(/\s+as\s+/)
                .pop()
                .trim();
              if (clean) exportedNames.add(clean);
            });
          } else {
            exportedNames.add(m[1]);
          }
        }
      }
      if (exportedNames.size > 0) {
        for (const file of jsFiles) {
          const source = fs.readFileSync(file, 'utf8');
          const importMatch = source.match(
            /import\s*\{([^}]+)\}\s*from\s*['"]react-native-iap['"]/,
          );
          if (importMatch) {
            const names = importMatch[1]
              .split(',')
              .map((n) => n.trim())
              .filter(Boolean);
            for (const name of names) {
              if (!exportedNames.has(name)) {
                error(
                  13,
                  `${path.relative(ROOT, file)} — imports '${name}' from react-native-iap but it is not exported by the installed module (API may have changed)`,
                );
              }
            }
          }
        }
      }
    }
  }

  if (errors === errsBefore13) console.log('  OK');
} else {
  console.log('  SKIP (no app.json)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. Paywall & entitlement logic
// ─────────────────────────────────────────────────────────────────────────────
heading(14, 'Paywall & entitlement logic');

const errsBefore14 = errors;
const warnsBefore14 = warnings;

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  const lines = source.split('\n');

  // Check for pro status stored only in AsyncStorage without store verification
  const hasAsyncStoragePro =
    /AsyncStorage.*\b(isPro|proStatus|pro_status|is_pro)\b|@forkit[_/]pro\b/i.test(source);
  const hasStoreCheck = /getAvailablePurchases|checkActivePurchases|getSubscriptions/i.test(source);

  if (hasAsyncStoragePro && !hasStoreCheck) {
    warn(14, `${rel} — Pro status in AsyncStorage but no store purchase verification found`);
  }

  // Check that purchase calls are wrapped in try/catch
  for (let i = 0; i < lines.length; i++) {
    if (/requestSubscription\(|requestPurchase\(|purchasePackage\(/.test(lines[i])) {
      // Widened to 15 lines so a single try { ... } wrapping multiple
      // platform branches (ios vs android requestPurchase shapes) is detected.
      const context = lines.slice(Math.max(0, i - 15), i + 1).join('\n');
      if (!/try\s*\{/.test(context)) {
        error(14, `${rel}:${i + 1} — Purchase call without try/catch error handling`);
      }
    }
  }

  // Check for hardcoded price that could drift from store
  for (let i = 0; i < lines.length; i++) {
    if (/\$1\.99/.test(lines[i]) && !/comment|Comment|\/\//.test(lines[i])) {
      // Only warn — hardcoded price labels are common, but should ideally come from store
      const trimmed = lines[i].trim();
      if (!trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        warn(
          14,
          `${rel}:${i + 1} — Hardcoded price "$1.99" — consider fetching from store offerings`,
        );
      }
    }
  }
}

if (errors === errsBefore14 && warnings === warnsBefore14) console.log('  OK');

// ─────────────────────────────────────────────────────────────────────────────
// 15. Cross-file prop consistency
// ─────────────────────────────────────────────────────────────────────────────
heading(15, 'Cross-file prop consistency');

const errsBefore15 = errors;

// Build a map of component definitions: { ComponentName: { file, props: Set } }
const componentDefs = new Map();
// Build a map of component usages: { ComponentName: [{ file, passedProps: Set }] }
const componentUsages = new Map();

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);

  // Find function components with destructured props:
  // function Foo({ a, b, c }) or const Foo = ({ a, b, c }) =>
  const funcDefs = [
    ...source.matchAll(/^(?:export\s+)?function\s+([A-Z]\w+)\s*\(\{\s*([\s\S]*?)\}\)/gm),
    ...source.matchAll(/^(?:export\s+)?const\s+([A-Z]\w+)\s*=\s*\(\{\s*([\s\S]*?)\}\)\s*=>/gm),
  ];

  for (const fd of funcDefs) {
    const name = fd[1];
    const propsBlock = fd[2];
    // Extract prop names (handle multiline, trailing commas, defaults)
    const props = new Set();
    for (const pm of propsBlock.matchAll(/(\w+)(?:\s*=\s*[^,}]+)?/g)) {
      props.add(pm[1]);
    }
    if (props.size > 0) {
      componentDefs.set(name, { file: rel, props });
    }
  }

  // Find JSX usages: <ComponentName prop1={...} prop2 prop3="..." />
  // Match both self-closing and opening tags, including multiline
  const usagePattern = /<([A-Z]\w+)([\s\S]*?)(?:\/>|(?<!=)>)/g;
  let um;
  while ((um = usagePattern.exec(source)) !== null) {
    const name = um[1];
    const attrsBlock = um[2];
    const passedProps = new Set();
    passedProps.add('children'); // children always implicitly available via JSX
    // Match: prop={...}, prop="...", prop='...', or bare boolean prop
    for (const am of attrsBlock.matchAll(/\b(\w+)(?:\s*=)?/g)) {
      passedProps.add(am[1]);
    }
    if (!componentUsages.has(name)) componentUsages.set(name, []);
    componentUsages.get(name).push({ file: rel, passedProps });
  }
}

// Check: props destructured in component but never passed by any cross-file caller
// Use a simple text search: look for "propName=" or "propName}" near <ComponentName in caller files
for (const [name, def] of componentDefs) {
  // Find files that reference this component (cross-file only)
  const callerFiles = [];
  for (const file of jsFiles) {
    const rel = path.relative(ROOT, file);
    if (rel === def.file) continue; // skip same-file
    const src = fs.readFileSync(file, 'utf8');
    if (src.includes(`<${name}`)) {
      callerFiles.push({ file: rel, source: src });
    }
  }
  if (callerFiles.length === 0) continue;

  for (const prop of def.props) {
    if (prop === 'children') continue; // always implicitly available
    // Check if any caller file contains the prop name as a JSX attribute
    // Matches: prop={, prop=", or bare boolean prop followed by whitespace/newline/>
    const propPattern = new RegExp(`\\b${prop}\\b(?:\\s*[={]|\\s*[/\\n>])`, 'g');
    const everPassed = callerFiles.some((cf) => propPattern.test(cf.source));
    if (!everPassed) {
      error(
        15,
        `<${name}> destructures "${prop}" but no cross-file caller passes it (defined in ${def.file})`,
      );
    }
  }
}

if (errors === errsBefore15) console.log('  OK');

// ─────────────────────────────────────────────────────────────────────────────
// 16. Cross-file style references
// ─────────────────────────────────────────────────────────────────────────────
heading(16, 'Cross-file style references');

const errsBefore16 = errors;

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);

  // Find styles.xxx references
  const styleRefs = new Set();
  for (const rm of source.matchAll(/styles\.(\w+)/g)) {
    styleRefs.add(rm[1]);
  }
  if (styleRefs.size === 0) continue;

  // Check if this file defines its own StyleSheet or imports one
  const hasLocalSheet = /StyleSheet\.create/.test(source);
  const importsStyles = /import\s+.*styles.*from/i.test(source) || /require.*styles/i.test(source);

  if (styleRefs.size > 0 && !hasLocalSheet && !importsStyles) {
    // File uses styles.xxx but has no StyleSheet and no style import
    error(16, `${rel} references styles.* but has no StyleSheet.create() or style import`);
  }
}

if (errors === errsBefore16) console.log('  OK');

// ─────────────────────────────────────────────────────────────────────────────
// 17. Circular dependency detection
// ─────────────────────────────────────────────────────────────────────────────
heading(17, 'Circular dependency detection');

const errsBefore17 = errors;

// Build import graph for local files
const importGraph = new Map(); // file -> Set of files it imports

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  const imports = new Set();

  const localImports = [...source.matchAll(/(?:from|require\()\s*['"](\.[^'"]+)['"]/g)];
  for (const li of localImports) {
    const specifier = li[1];
    const base = path.resolve(dir, specifier);
    // Resolve to actual file
    const resolved = extensions.map((ext) => base + ext).find((p) => fs.existsSync(p));
    if (resolved) imports.add(resolved);
  }

  importGraph.set(file, imports);
}

// Detect direct circular imports (A imports B, B imports A)
const reportedCycles = new Set();
for (const [fileA, importsA] of importGraph) {
  for (const fileB of importsA) {
    const importsB = importGraph.get(fileB);
    if (importsB && importsB.has(fileA)) {
      const pair = [fileA, fileB].sort().join(' <-> ');
      if (!reportedCycles.has(pair)) {
        reportedCycles.add(pair);
        error(17, `Circular: ${path.relative(ROOT, fileA)} <-> ${path.relative(ROOT, fileB)}`);
      }
    }
  }
}

if (errors === errsBefore17) console.log('  OK');

// ─────────────────────────────────────────────────────────────────────────────
// 18. Orphan exports
// ─────────────────────────────────────────────────────────────────────────────
heading(18, 'Orphan exports');

const warnsBefore18 = warnings;

// Collect all exports from each file
const fileExports = new Map(); // file -> Set of exported names
for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const exported = new Set();

  // export function Foo / export const Foo / export default
  for (const em of source.matchAll(
    /^export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class)\s+(\w+)/gm,
  )) {
    exported.add(em[1]);
  }
  // export { Foo, Bar }
  for (const em of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const name of em[1].split(',')) {
      const trimmed = name
        .trim()
        .split(/\s+as\s+/)
        .pop()
        .trim();
      if (trimmed) exported.add(trimmed);
    }
  }

  if (exported.size > 0) fileExports.set(file, exported);
}

// Collect all imports across all files
const allImportedNames = new Set();
for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  // import { Foo, Bar } from '...'
  for (const im of source.matchAll(/import\s*\{([^}]+)\}\s*from/g)) {
    for (const name of im[1].split(',')) {
      const trimmed = name
        .trim()
        .split(/\s+as\s+/)[0]
        .trim();
      if (trimmed) allImportedNames.add(trimmed);
    }
  }
  // import Foo from '...'
  for (const im of source.matchAll(/import\s+(\w+)\s+from/g)) {
    allImportedNames.add(im[1]);
  }
}

// Entry point exports don't need to be imported (they're used by the framework)
const entryFiles = new Set([path.join(ROOT, 'App.js'), path.join(ROOT, 'index.js')]);

for (const [file, exported] of fileExports) {
  if (entryFiles.has(file)) continue;
  for (const name of exported) {
    if (!allImportedNames.has(name)) {
      warn(18, `${path.relative(ROOT, file)} exports "${name}" but nothing imports it`);
    }
  }
}

if (warnings === warnsBefore18) console.log('  OK');

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════');
if (errors > 0) {
  console.error(`FAILED: ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`PASSED with ${warnings} warning(s)`);
} else {
  console.log('ALL CHECKS PASSED');
}
