# Privacy Policy for ForkIt!

**Last Updated:** April 4, 2026

## Introduction

ForkIt! ("we," "our," or "the app") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use the ForkIt! application on Android, iOS, or the web.

## Information We Collect

### Location Data

ForkIt! collects and uses your device's location data to provide the core functionality of the app:

- **Precise Location (GPS)**: Used to find nearby restaurants within your selected radius
- **Approximate Location**: Used as a fallback if precise location is unavailable

**How we use location data:**
- Finding restaurants near you using the Google Places API
- Calculating distances to restaurant locations
- Filtering search results based on your selected radius

**Location data handling:**
- Location data is processed in real-time and is **NOT** stored on our servers
- Location data is **NOT** shared with third parties (except Google Places API for search functionality)
- Your most recent location coordinates are temporarily cached on your device for faster searches. This cached data expires after 1 hour and is removed when you uninstall the app
- No location history is maintained beyond the single most recent lookup

### Group Fork Sessions (Premium Feature)

When you use the Group Fork feature to pick a restaurant with friends:

- **Display Name**: A self-chosen nickname (not your real name) is stored temporarily in the session and visible to other participants.
- **Filter Preferences**: Your selected filters are stored temporarily in the session.
- **Session Data**: All session data is stored on our servers using Vercel KV (Redis) and **automatically deleted after 1 hour**. No session data is retained beyond this window.
- **No Account Required**: Group Fork does not require user accounts, login, or registration.

### User Data

ForkIt! stores all user data locally on your device:

- **No accounts or sign-in**: The app works anonymously. There are no user accounts, no login, and no authentication
- **Local storage only**: Favorites, blocked restaurants, custom spots, and fork history are stored on your device using AsyncStorage. No user data is sent to or stored on any server
- **Export/Import**: You can export your data (favorites, blocked places, and custom spots) as a JSON file via the share sheet, and import from a JSON file. Exported files include a timestamp and stay entirely under your control

### Subscription Data

ForkIt! Pro subscriptions are handled directly by the Apple App Store and Google Play Store:

- No third-party purchase server receives your purchase data
- Payment processing is handled entirely by Apple App Store or Google Play — ForkIt! never sees payment details
- Purchase receipts are validated locally on the device

### Crash Reporting

ForkIt! uses Sentry for crash reporting in production builds:

- Crash reports include stack traces and device info (OS version, device model)
- PII scrubbing is enabled — no user-identifying information is included
- Crash reporting is disabled in development builds

### Server-Side Logging

Our backend may temporarily log:
- Search parameters (radius, price, rating filters) for error debugging — these logs are not associated with your identity and are automatically rotated
- Search keywords are not stored permanently

### Data NOT Collected

ForkIt! does **NOT** collect, store, or process:
- Advertising identifiers or tracking data
- Usage analytics or behavior tracking
- Contacts, photos, or other device data
- Payment card numbers or bank details

## Third-Party Services

### Google Places API

ForkIt! uses the Google Places API to:
- Search for nearby restaurants
- Retrieve restaurant details (name, rating, price, hours, phone number)
- Provide location-based services

When you use ForkIt!, your location data is sent to Google Places API in accordance with [Google's Privacy Policy](https://policies.google.com/privacy).

**Note:** We do not control Google's data practices. Please review Google's Privacy Policy to understand how they handle data.

### Sentry (Crash Reporting)

ForkIt! uses Sentry for crash reporting with PII scrubbing enabled. See [Sentry's Privacy Policy](https://sentry.io/privacy/).

### Apple App Store & Google Play Store

In-app purchases are processed directly by the Apple App Store and Google Play Store. ForkIt! does not use any third-party purchase management service. See [Apple Privacy Policy](https://www.apple.com/legal/privacy/) and [Google Privacy Policy](https://policies.google.com/privacy).

### External Links

ForkIt! provides links to:
- Google Maps (for navigation)
- Recipe websites (YouTube, Google Search, Allrecipes)

When you click these links, you leave the ForkIt! app and are subject to the privacy policies of those external services.

## Data Storage

- **Local Storage**: App preferences, filter settings, favorites, blocked restaurants, custom spots, and fork history are stored locally on your device using AsyncStorage
- **Ephemeral Server Storage**: Group Fork sessions are stored temporarily (max 1 hour) on Vercel KV (Redis) servers and then automatically deleted
- **No Cloud Storage**: There is no server-side user data storage. All your data lives on your device and can be exported/imported as a JSON file

## Permissions

### Android
1. **ACCESS_FINE_LOCATION** - For precise GPS location
2. **ACCESS_COARSE_LOCATION** - For approximate location (fallback)
3. **INTERNET** - To communicate with Google Places API

### iOS
1. **Location When In Use** - For GPS location while the app is open

### Web
1. **Geolocation** - Browser-level location access via the Geolocation API

You can revoke these permissions at any time through your device or browser settings. If you deny location permissions, the app will not function as it requires location to search for nearby restaurants.

## Children's Privacy

ForkIt! is intended for users aged 13 and older. We do not knowingly collect information from children under 13.

## Data Security

- All network communications use HTTPS encryption
- Location data is transmitted securely to Google Places API
- All user data is stored locally on your device — no passwords, accounts, or cloud databases

## Data Retention

- **Location Data**: Not retained (ephemeral, used only during active session)
- **Filter Preferences**: Stored locally on device until app is uninstalled
- **Fork History**: Stored locally on device. Can be deleted at any time from the history screen in the app
- **Group Fork Sessions**: Automatically deleted after 1 hour (server-side)

## User Rights

### Data Deletion

- Uninstalling the app removes all locally stored data
- Fork history can be deleted from the history screen in the app
- Favorites, blocked restaurants, and custom spots can be managed directly in the app

### Data Access

You can view all your data (favorites, blocked restaurants, custom spots, fork history) in the app. You can also export your data as a JSON file via the share sheet for a complete portable copy.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. When we do:
- The "Last Updated" date will be revised
- Material changes will be communicated through app updates
- Continued use of the app after changes constitutes acceptance

## Legal Basis for Processing (GDPR)

For users in the European Economic Area (EEA):
- **Legal Basis**: Legitimate interest and consent
- **Purpose**: Provide location-based restaurant search functionality
- **Data Minimization**: We only process location data necessary for core functionality
- **Right to Object**: You can deny location permissions to stop processing

## California Privacy Rights (CCPA)

For California residents:
- ForkIt! does not "sell" personal information
- ForkIt! does not collect personal information beyond location data (which is not stored)
- No opt-out mechanism is needed as data is not sold or stored

## International Data Transfers

Location data sent to Google Places API may be transferred internationally in accordance with Google's data practices. ForkIt! itself does not transfer data internationally as we do not operate servers.

## Contact Us

If you have questions about this Privacy Policy or ForkIt!'s privacy practices, contact us at:

**Email:** ctuckersolutions@gmail.com
**GitHub:** https://github.com/CherrelleTucker/forkit/issues (for issue reporting)

## Consent

By using ForkIt!, you consent to:
- This Privacy Policy
- The collection and use of location data as described
- The sharing of location data with Google Places API for functionality
- Google's Privacy Policy regarding Places API usage

---

## Summary (TL;DR)

- **What we collect:** Your location (GPS) to find nearby restaurants
- **How we use it:** Search Google Places API for restaurants near you
- **Do we store it?** No, location data is not stored
- **Do we share it?** Only with Google Places API to perform searches
- **User accounts?** No accounts needed — the app works anonymously
- **Your data:** Stored only on your device. Export anytime as a JSON file
- **How to delete data?** Uninstall removes all data. Delete history and manage favorites in-app

ForkIt! is a privacy-focused app that only processes the minimum data needed to help you choose a restaurant.
