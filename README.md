# ForkIt!

**Can't decide where to eat? F...ork it. Let fate decide.**

ForkIt! is a random restaurant picker that removes decision fatigue. One tap, one random restaurant nearby, done. Skip the chains, find a local spot, bring friends along for a group pick — or just shut the door on the "I don't know, what do *you* want?" loop.

[Google Play](https://play.google.com/store/apps/details?id=com.forkit.app) · [App Store](https://apps.apple.com/app/forkit-restaurant-picker/id6759990349) · [forkaround.io](https://forkaround.io)

---

## About this repository

This is the **open-source React Native client** for ForkIt!. The backend, curated data (chain lists, category mappings), and web landing pages are closed-source. This repo exists so others can:

- Read real production React Native + Expo code
- Study how a solo indie shipped to both app stores
- Contribute fixes or features back under a noncommercial license

ForkIt! started as a case study in what a single developer could build with AI-assisted tooling. If you want the full narrative — architecture decisions, cost tradeoffs, store submission battles — see the case study at [forkaround.io/case-study](https://forkaround.io/case-study).

---

## What's in here

```
App.js                  # Main orchestrator
app.json                # Expo config
eas.json                # EAS build config
index.js                # Entry point
components/             # UI components (modals, buttons, tour, etc.)
constants/              # Config, theme, storage keys, content
hooks/                  # Custom React hooks
utils/                  # Platform wrappers, helpers, API client, storage
assets/                 # Icons, fonts, images
__tests__/              # Jest tests
android/, ios/          # Native project files (Expo-managed)
scripts/                # Build + validation scripts
storekit/               # iOS StoreKit configuration
```

**Not included** (kept private):
- Backend (`forkit-backend/`) — Vercel serverless functions, API proxy, rate limiting, Play Integrity verification, Fork Around session storage
- Curated data — chain detection list, cuisine-to-keyword mappings
- Web landing page, hosted docs, and case study content
- Signing keys, API keys, secrets (`.env`, `.p8`, service-account JSONs)

---

## Features

- **Random picks** — One button, one restaurant. No infinite scroll.
- **Walk or drive** — Travel mode filter with smart walk-mode suggestions in dense areas.
- **Skip the chains** — Hidden Gems mode filters out chain restaurants to surface local spots.
- **Fork Around** — Group picking: host creates a session, friends join with a 4-letter code or web link, filters merge, one random pick for the table. Sessions persist if the host backgrounds the app.
- **Pool caching** — First tap fetches the full pool. Re-rolls pick locally with zero API calls until filters change or the cache expires.
- **Custom spots** — Add Mom's house (or anywhere) with tags like "pasta, homecooking" so they filter alongside Google results.
- **Block list** — Permanently exclude places you don't want to see.
- **Closing-soon warnings** — Skips places closing within 30 minutes; warns on 60.
- **Interactive tour** — 12-step spotlight walkthrough on first launch, replayable from the info modal.
- **Export / import** — JSON backup via share sheet and document picker. Free tier included.

---

## Running locally

You'll need [Node.js 20+](https://nodejs.org/), [Xcode](https://developer.apple.com/xcode/) (iOS) or [Android Studio](https://developer.android.com/studio) (Android), and the [Expo CLI](https://docs.expo.dev/more/expo-cli/).

```bash
git clone https://github.com/CherrelleTucker/forkit-open.git
cd forkit-open
npm install
cp .env.example .env     # fill in EXPO_PUBLIC_BACKEND_URL
npx expo start
```

The app will run against whatever `EXPO_PUBLIC_BACKEND_URL` you point it at. Without your own backend, network features (Fork, Fork Around) won't return real results — but the UI is fully navigable and testable.

A native dev build is required the first time you run on a device (native modules like `react-native-iap` don't work in Expo Go):

```bash
npx expo run:ios --device      # physical iPhone
npx expo run:android           # Android emulator or USB device
```

---

## Running the quality checks

Before opening a pull request, all checks must pass locally:

```bash
npm run review
```

This chains seven checks: ESLint (zero warnings), Prettier, Knip (dead-code), `npm audit`, Secretlint, a custom AI-pitfall validator (`validate-vibe`), and a doc-consistency validator. Auto-fix what's auto-fixable with:

```bash
npm run review:fix
```

Tests run with `npm test`.

---

## Contributing

PRs welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) first — it covers the contribution scope, commit style, and what's in/out of scope for this repo.

**Bug reports and feature requests** go in the feedback tracker, not this repo:
→ [CherrelleTucker/forkit-feedback](https://github.com/CherrelleTucker/forkit-feedback/issues)

This repo's issues are for discussions about the client code itself. Store-facing bugs, UX gripes, and product requests belong in `forkit-feedback` where non-developers can file them too.

---

## Security

Found something that looks like a vulnerability? Don't open a public issue. See [SECURITY.md](./SECURITY.md) for private disclosure instructions.

---

## License

[PolyForm Noncommercial License 1.0.0](./LICENSE).

You can read, fork, modify, and contribute. You **cannot** ship a commercial copy — including a rebranded clone on the app stores or a paid service built on this code. Noncommercial research, personal projects, classroom use, and nonprofit use are all permitted.

---

## Acknowledgements

Built by [Cherrelle Tucker](https://forkaround.io) as part of ForkAround. Huntsville, Alabama, USA. Thanks to the r/HuntsvilleAlabama beta testers who made the early weeks possible.
