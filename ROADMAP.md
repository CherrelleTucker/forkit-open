# ForkIt! Product Roadmap

**Last Updated:** March 2026
**Current Version:** 4.0.0

---

## Shipped

### v1.0.0 — Initial Release (January 2026)
- Random restaurant selection with smart filters (distance, price, rating, cuisine, open now)
- Hidden Gems mode (skip chains, discover local)
- Google Maps navigation + call restaurant
- Favorites, blocked list, custom spots ("Mom's house")
- Backend proxy (Vercel serverless) with Play Integrity
- Android: Google Play (internal testing → production)

### v1.1.0 — Fork Around & Polish (March 2026)
- **Fork Around (Group Fork)**: Host creates session, friends join via 4-letter code or web link, merged filters, random pick
- **Web joiner**: Browser-based group joining at forkit-web.vercel.app/group (no app required)
- **iOS launch**: Live on App Store
- **Closing soon filter**: Excludes restaurants closing within 30 min, warns within 60 min
- **Search near a different location**: Enter an address instead of only GPS
- Walk mode suggestion threshold tuning
- Web landing page replacing full Expo web export

### v2.0.0 — Tour, Pro, & Custom Spot Tags (March 2026)
- **Interactive Tour**: 12-step spotlight walkthrough, auto-launches on first open, replayable from info modal
- **Pro Subscription (IAP)**: RevenueCat-powered $1.99/month. 20 free searches + 1 Fork Around/month for free users
- **Custom Spot Tags**: Tag saved spots with cuisine keywords for filtered matching alongside Google results
- **Fork Around UX**: Host session persistence, rejoin after restart, streamlined host name flow, guest close minimizes instead of leaving, scroll indicators
- **Pool caching**: First tap fetches full pool; re-rolls are free with zero API calls
- **Font scaling accessibility**: maxFontSizeMultiplier 1.3 across all text
- **Color theory branding**: Orange = problem/challenge, Teal = solution/answer
- **Multi-file architecture**: Components, utils, constants extracted from monolithic App.js

### v2.1.0 — Promo Codes & OTA Updates (March 2026)
- **Promo Code Redemption**: In-app code entry grants Pro for 1 year via RevenueCat API
- **Redesigned Free & Pro section**: Collapsible Subscribe panel, "Have a promo code?" expander, Pro member since date
- **EAS Update (OTA)**: JS-only fixes can be pushed instantly without store builds
- **Sentry Source Maps**: Crash reports now include readable stack traces

---

### v3.0.0 — User Accounts & History (March 2026)
- **User Accounts**: Optional sign-in via Apple or Google (Clerk + Neon serverless Postgres)
- **Fork History**: View past solo and group fork results tied to account
- **Cross-Device Sync**: Favorites, blocked places, and custom spots sync across devices when signed in
- **Redesigned Info Modal**: Account, Subscription, and About sections
- **RevenueCat Account Linking**: Auto-restore purchases on sign-in
- **Privacy Policy Updated**: Reflects account data handling
- **Crash Reporting via Sentry**: Production crash reports with readable stack traces

### v4.0.0 — Simplify Everything (March 2026)
- **Clerk removed**: No user accounts or sign-in. All data local-first
- **Neon removed**: No server-side database. Everything stored locally via AsyncStorage
- **RevenueCat replaced with react-native-iap**: Direct store communication, no third-party purchase server
- **Pro+ now $2.99/month** (was $4.99). Free tier 10 searches/month. Filters gated to Pro
- **Export/Import**: JSON backup via share sheet and document picker. Available to all tiers
- **Alternative picks**: See runner-up restaurant options (Pro and above)
- **History local**: Last 50 solo + 50 group entries in AsyncStorage
- **Tour redesigned**: Inline mocks replace spotlight overlay
- **Info modal restructured**: YOUR PLAN, HELP (Tour + Feedback), YOUR DATA (Export/Import + Privacy + Terms)
- **Tiered field masks**: Minimal masks for free tier, full for Pro+, reducing API cost

---

## Up Next

### Auto-Escalation to IDs-Only Search
- At volume threshold, degrade to IDs-only Nearby Search + selective Details calls to stay within API cost budget ([#163](https://github.com/CherrelleTucker/forkit/issues/163))

### "I Don't Want This" Re-Roll UX
- One-tap rejection that re-rolls without burning a search credit, with optional "why not?" feedback ([forkit-feedback#6](https://github.com/ForknAround/forkit-feedback/issues/6))

### Conversion Analytics
- Instrument paywall views, upgrade taps, and trial-to-paid conversion to guide pricing and feature gating decisions

---

## Future Ideas

- **Community Spotlight**: Highlight local businesses (women-owned, Black-owned, etc.) — needs external data source
- ~~**Favorites Sync**: Cross-device sync~~ *(shipped in v3.0.0)*
- **Budget-aware mode**: Weekly/monthly food budget tracking
- **Weather-aware suggestions**: Indoor dining when it's raining

---

## Monetization

- **Free tier**: 10 searches/month, 1 Fork Around session/month. Re-rolls from cached pool are free and unlimited
- **Pro** ($1.99/month): 20 searches, 3 sessions, all filters, full details, alternative picks
- **Pro+** ($2.99/month): Unlimited everything
- No ads — user experience over revenue

---

## Contact

**Developer:** Cherrelle Tucker
**GitHub:** https://github.com/CherrelleTucker/forkit
**Privacy Policy:** https://CherrelleTucker.github.io/forkit/privacy.html
