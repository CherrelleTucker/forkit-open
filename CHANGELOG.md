# ForkIt! Changelog

## v4.0.0 — March 29, 2026

### Major Changes
- **Clerk removed**: No more user accounts or sign-in. All data is local-first
- **Neon removed**: No server-side database. Favorites, blocked places, custom spots, and history stored locally via AsyncStorage
- **RevenueCat replaced with react-native-iap**: Direct store communication, no third-party purchase server
- **Pro+ now $2.99/month** (was $4.99). Pro remains $1.99/month
- **Free tier**: 10 searches/month, 1 Fork Around session/month

### New Features
- **Export/Import**: JSON backup via share sheet (export) and document picker (import). Available to all tiers. Merges on import with no duplicates
- **Alternative picks**: See runner-up restaurant options (Pro and above)
- **Filters gated to Pro**: Cuisine, price, and rating filters require Pro subscription

### Improvements
- **History is local**: Last 50 solo + 50 group entries stored in AsyncStorage (no server)
- **Tour redesigned**: Inline mocks replace spotlight overlay for a cleaner first-launch experience
- **Info modal restructured**: Reorganized into YOUR PLAN, HELP (Tour + Feedback), and YOUR DATA (Export/Import + Privacy + Terms) sections
- **Tiered field masks**: API requests use minimal field masks for free tier, full masks for Pro+, reducing per-request cost
- **Session autocomplete**: Fork Around sessions restore seamlessly on app restart
- **Quota fallback**: Graceful degradation when API quota is exceeded

---

## v3.1.0 — March 22, 2026

### New Features
- **3-Tier Pricing**: Free (10 searches, 1 Fork Around session/month) / Pro $1.99 (20 searches, 3 sessions) / Pro+ $2.99 (unlimited searches, unlimited sessions)
- **Redesigned Paywall**: 3-tier comparison layout showing feature breakdown across Free, Pro, and Pro+ tiers

### Improvements
- **API Cost Optimizations**: Adaptive 2-3 Nearby Search calls (was 6), server-side search caching, full Enterprise field mask to reduce per-request cost

---

## v3.0.0 — March 2026

### New Features
- **User Accounts**: Optional sign-in via Apple or Google (powered by Clerk). No account required — all existing features work without signing in
- **Fork History**: View past solo and group fork results tied to your account
- **Cross-Device Sync**: Favorites, blocked places, and custom spots sync across devices when signed in
- **RevenueCat Account Linking**: Pro subscription auto-restores on sign-in — no need to manually restore purchases on a new device

### Improvements
- **Redesigned Info Modal**: Reorganized into Account, Subscription, and About sections for clearer navigation
- **Go Pro visible without sign-in**: Non-signed-in users now see usage counts, Go Pro button, and Restore Purchase. Tapping Go Pro prompts sign-in with a direct link to the sign-in screen
- **Sign-out data handling**: Local data persists after sign-out (syncs on next sign-in). Switching to a different account clears previous user's local data before syncing
- **Privacy Policy Updated**: Reflects account data handling, Clerk authentication, Sentry crash reporting, and RevenueCat subscriptions
- **Crash Reporting via Sentry**: Production crash reports with PII scrubbing (beforeSend strips IP, email, location data from breadcrumbs)
- **Toast improvements**: Higher contrast background, narrower width

### Security
- **Promo code auth**: Redemption endpoint now requires Clerk JWT authentication
- **CORS hardening**: Referer check uses URL parsing instead of `.startsWith()` to prevent subdomain spoofing. Localhost origins excluded in production
- **Stale token fix**: Sync uploads build request body first, then fetch a fresh token immediately before the network call
- **Backend log sanitization**: All error logs use `error.message` only — no full error objects, no user search keywords

---

## v2.1.0 — March 2026

### New Features
- **Promo Code Redemption**: Redeem promo codes for free Pro access directly in the app. Backend validates codes and grants Pro for 1 year via RevenueCat API
- **EAS Update (OTA)**: JS-only fixes can now be pushed instantly without a store build or review
- **Sentry Source Maps**: Crash reports now include readable stack traces (source map upload configured for EAS builds)

### Improvements
- **Redesigned Free & Pro section**: Collapsible "Subscribe" panel hides Go Pro / Restore Purchase / promo code behind a single button for a cleaner info modal
- **"Have a promo code?"** expander nested inside the Subscribe panel — visible only when needed
- **Pro member status**: Info modal shows "Pro member since [date]" when subscribed
- Removed "Free searches reset on the 1st" text from upgrade paywall

### Architecture
- New backend endpoint: `api/redeem-code.js` — validates promo codes, grants entitlements via RevenueCat V2 API, tracks redemptions in Redis
- `getRedis()` exported from `lib/group.js` for reuse across endpoints
- `useUsage` hook: added `proSinceDate`, `refreshPro()`, and centralized `updateProStatus()` helper
- Vercel env vars: `REVENUECAT_API_KEY`, `REVENUECAT_PROJECT_ID`, `PROMO_CODES`

---

## v2.0.0 — March 2026

### New Features
- **Interactive Tour**: 12-step spotlight walkthrough, auto-launches on first open. Covers all features and Free vs Pro. Replayable from info modal ("Take a Tour")
- **Custom Spot Tags**: Tag your saved spots (e.g. "pasta, homecooking, spicy") so they filter alongside Google results by cuisine keyword and exclusions
- **Pro Subscription (IAP)**: RevenueCat-powered $1.99/month via Apple and Google. 20 free searches + 1 Fork Around session/month for free users
- **Fork Around Improvements**:
  - Host session persists across app restarts
  - Host name optional at session creation, entered on the hosting screen
  - Solo result card hidden during group sessions
  - Backend rejoin endpoint for session recovery
  - Guest close minimizes modal instead of leaving session
  - Scroll indicators on scrollable group modal steps
- **Your Spots in Fork Around**: Location field searches Your Spots by name, geocodes address on selection
- **Pool caching**: First "Fork It" tap fetches full pool; subsequent taps pick locally with zero API calls. Cache invalidates on filter change or after 4 hours
- **Color theory branding**: Orange = problem/challenge, Teal = solution/answer — applied consistently throughout

### Improvements
- Font scaling accessibility: maxFontSizeMultiplier capped at 1.3 for consistent layouts at all system font sizes
- Pill button styling consistency fixes (compact padding, no forced minHeight)

### Architecture
- Multi-file refactor: App.js split into components/, utils/, and constants/ modules
- Cross-platform tour spotlight alignment (StatusBar offset for Android)
- Responsive bottom-anchored tooltip positioning

### Bug Fixes
- Fixed RevenueCat crash on dev builds when API key is empty
- Fixed solo result card persisting into group fork mode
- Fixed tour spotlight offset on Android
- Fixed tooltip covering spotlighted elements on lower-screen tour steps

---

## v1.1.0 — March 2026

### New Features
- **Fork Around (Group Fork)**: Host creates session, friends join via 4-letter code or web link, merged filters, random pick
- **Web joiner**: Browser-based group joining at forkit-web.vercel.app/group (no app required)
- **iOS launch**: Live on App Store
- **Closing soon filter**: Excludes restaurants closing within 30 min, warns within 60 min
- **Search near a different location**: Enter an address instead of only GPS

### Improvements
- Walk mode suggestion threshold tuning
- Web landing page replacing full Expo web export

---

## v1.0.0 — January 2026

### Initial Release
- Random restaurant selection with smart filters (distance, price, rating, cuisine, open now)
- Hidden Gems mode (skip chains, discover local)
- Google Maps navigation + call restaurant
- Favorites, blocked list, custom spots
- Backend proxy (Vercel serverless) with Play Integrity
- API key protection (server-side only)
- Android: Google Play launch
