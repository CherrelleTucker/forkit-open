/**
 * ForkIt Review Suite — ESLint Configuration
 *
 * Categories:
 *   1. AI Pitfall Detection — catches common vibe-coding mistakes
 *   2. Security — hardcoded secrets, eval, injection patterns
 *   3. React & React Native Best Practices — hooks, lifecycle, platform
 *   4. Accessibility — screen reader support, touch targets
 *   5. Code Quality & Consistency — complexity, duplication, dead code
 *   6. Documentation Standards — JSDoc on exported/public functions
 *   7. Design Consistency — naming, imports, style patterns
 *
 * Rules are set to "warn" for the initial baseline so you can see all
 * issues without blocking builds. Promote to "error" over time.
 * Run `npm run lint:strict` to treat warnings as errors.
 */
module.exports = {
  root: true,
  env: {
    'react-native/react-native': true,
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    'react',
    'react-hooks',
    'react-native',
    'react-native-a11y',
    'security',
    'sonarjs',
    'import',
    'jsdoc',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ['node_modules/', 'dist/', 'web-build/', '.expo/', 'ios/', 'android/'],

  rules: {
    // =========================================================
    // 1. AI PITFALL DETECTION
    // Common mistakes AI coding assistants introduce
    // =========================================================

    // AI loves console.log for debugging and forgets to remove them
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // AI generates unreachable code after returns
    'no-unreachable': 'error',

    // AI creates duplicate conditions in if-else chains
    'no-dupe-else-if': 'error',

    // AI duplicates keys in objects
    'no-dupe-keys': 'error',

    // AI sometimes assigns to function parameters
    'no-param-reassign': 'warn',

    // AI produces magic numbers — require named constants
    // Common UI values (sizes, spacings, durations) are excluded since they're
    // standard in React Native and don't benefit from being named constants.
    'no-magic-numbers': [
      'warn',
      {
        ignore: [
          -1, 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20, 22, 24, 30, 44, 48, 100, 180, 999,
        ],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        enforceConst: true,
      },
    ],

    // AI loves var; enforce const/let
    'no-var': 'error',
    'prefer-const': 'warn',

    // AI generates empty catch blocks that swallow errors silently
    'no-empty': ['warn', { allowEmptyCatch: false }],

    // AI creates unused variables constantly
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

    // AI sometimes uses == instead of ===
    eqeqeq: ['warn', 'always'],

    // AI creates identical if/else branches
    'no-duplicate-case': 'error',

    // AI produces redundant boolean casts
    'no-extra-boolean-cast': 'warn',

    // AI references variables before declaration
    // Note: functions: false because hoisting is standard JS. variables: false
    // because in single-file React apps, components defined below are referenced above.
    'no-use-before-define': ['warn', { functions: false, classes: true, variables: false }],

    // =========================================================
    // 2. SECURITY
    // Hardcoded secrets, injection risks, unsafe patterns
    // =========================================================

    // Detect eval() and similar code execution
    'security/detect-eval-with-expression': 'error',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-object-injection': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-unsafe-regex': 'warn',

    // No eval — ever
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // =========================================================
    // 3. REACT & REACT NATIVE BEST PRACTICES
    // Hooks, lifecycle, platform-specific patterns
    // =========================================================

    // CRITICAL: Hook rules — these catch the most common AI bugs
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Tell ESLint that JSX uses these variables (prevents false "unused" warnings)
    'react/jsx-uses-vars': 'error',
    'react/jsx-uses-react': 'off', // React 19 doesn't need React import for JSX

    // React best practices
    'react/jsx-key': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/no-direct-mutation-state': 'error',
    'react/no-deprecated': 'warn',
    'react/self-closing-comp': 'warn',
    'react/jsx-curly-brace-presence': ['warn', { props: 'never', children: 'never' }],
    'react/no-array-index-key': 'warn',
    'react/no-unstable-nested-components': 'warn',
    'react/jsx-no-constructed-context-values': 'warn',

    // React Native specific
    'react-native/no-unused-styles': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    'react-native/no-raw-text': 'warn',

    // =========================================================
    // 4. ACCESSIBILITY
    // Screen reader support, labels, roles
    // =========================================================

    'react-native-a11y/has-accessibility-props': 'warn',
    'react-native-a11y/has-valid-accessibility-role': 'warn',
    'react-native-a11y/no-nested-touchables': 'warn',
    'react-native-a11y/has-valid-accessibility-state': 'warn',
    'react-native-a11y/has-valid-accessibility-value': 'warn',

    // =========================================================
    // 5. CODE QUALITY & CONSISTENCY
    // Complexity, duplication, maintainability
    // =========================================================

    // Cognitive complexity — AI creates deeply nested spaghetti
    'sonarjs/cognitive-complexity': ['warn', 20],

    // Duplicate code patterns — AI repeats itself across prompts
    'sonarjs/no-duplicate-string': ['warn', { threshold: 4 }],
    'sonarjs/no-duplicated-branches': 'warn',
    'sonarjs/no-identical-functions': 'warn',
    'sonarjs/no-identical-expressions': 'error',

    // Dead/unreachable code
    'sonarjs/no-redundant-jump': 'warn',
    'sonarjs/no-unused-collection': 'warn',
    'sonarjs/no-gratuitous-expressions': 'warn',
    'sonarjs/no-collapsible-if': 'warn',

    // Boolean logic simplification
    'sonarjs/prefer-single-boolean-return': 'warn',

    // Switch statement quality
    'sonarjs/no-small-switch': 'warn',
    'sonarjs/no-all-duplicated-branches': 'error',

    // Max function length — flag huge functions (AI generates monsters)
    'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],

    // Max file length
    'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],

    // Nesting depth — AI nests callbacks/ifs deeply
    'max-depth': ['warn', 4],

    // Max parameters — AI creates functions with too many params
    'max-params': ['warn', 4],

    // =========================================================
    // 6. DOCUMENTATION STANDARDS
    // JSDoc requirements for public functions and components
    // =========================================================

    // Require JSDoc on exported functions
    'jsdoc/require-jsdoc': [
      'warn',
      {
        require: {
          FunctionDeclaration: true,
          ArrowFunctionExpression: false,
          FunctionExpression: false,
          MethodDefinition: false,
        },
        publicOnly: true,
      },
    ],
    'jsdoc/require-description': ['warn', { contexts: ['FunctionDeclaration'] }],
    'jsdoc/require-param': 'warn',
    'jsdoc/require-returns': 'warn',
    'jsdoc/check-param-names': 'warn',
    'jsdoc/check-types': 'warn',
    'jsdoc/no-undefined-types': 'off',
    'jsdoc/valid-types': 'warn',

    // =========================================================
    // 7. DESIGN CONSISTENCY
    // Naming, imports, code organization
    // =========================================================

    // Consistent naming conventions
    camelcase: [
      'warn',
      {
        properties: 'never',
        ignoreDestructuring: true,
        allow: ['^UNSAFE_', '^Montserrat_'],
      },
    ],

    // Import organization
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-duplicates': 'warn',
    'import/newline-after-import': 'warn',

    // Consistent arrow functions
    'arrow-body-style': ['warn', 'as-needed'],
    'prefer-arrow-callback': 'warn',

    // Consistent object/array patterns
    'prefer-destructuring': [
      'warn',
      {
        VariableDeclarator: { array: false, object: true },
        AssignmentExpression: { array: false, object: false },
      },
    ],
    'object-shorthand': ['warn', 'always'],
    'prefer-template': 'warn',

    // No nested ternaries — AI loves these
    'no-nested-ternary': 'warn',

    // Consistent return
    'consistent-return': 'warn',
  },

  overrides: [
    {
      // Relax some rules for the main App.js (it's a single-file app — we know)
      files: ['App.js'],
      rules: {
        'max-lines': 'off',
        'max-lines-per-function': 'off',
        // App() is one big component with 5 modals; complexity is inherent to single-file arch
        'sonarjs/cognitive-complexity': ['warn', 40],
      },
    },
    {
      // Relax JSDoc for utility files
      files: ['utils/**/*.js'],
      rules: {
        'jsdoc/require-jsdoc': 'off',
      },
    },
    {
      // Config files use numbers for thresholds — not magic numbers
      files: ['.eslintrc.js', '*.config.js'],
      rules: {
        'no-magic-numbers': 'off',
      },
    },
    {
      // CLI scripts use console for output and don't need JSDoc
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off',
        'jsdoc/require-jsdoc': 'off',
        'jsdoc/require-param': 'off',
        'jsdoc/require-returns': 'off',
        'no-magic-numbers': 'off',
        'security/detect-object-injection': 'off',
        'security/detect-non-literal-regexp': 'off',
        'security/detect-unsafe-regex': 'off',
        'max-depth': 'off',
        'max-lines': 'off',
        'import/order': 'off',
      },
    },
  ],
};
