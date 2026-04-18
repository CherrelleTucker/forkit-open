// ForkIt — Numeric, timing, and configuration constants

import { Platform } from 'react-native';

// Backend API URL from environment variables
// For local development, add to .env file
// For EAS Build, use: eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value your_url
export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'https://forkit-backend.vercel.app';

// App version — sent with all backend requests via X-App-Version header
export const APP_VERSION = '4.0.0';

// Timing constants (milliseconds)
export const TOAST_SHORT = 1200;
export const TOAST_DEFAULT = 1600;
export const TOAST_LONG = 2200;
export const FETCH_TIMEOUT = 15000;
export const DETAILS_TIMEOUT = 8000;
export const DEBOUNCE_DELAY = 350;
export const THROTTLE_WINDOW = 60000;
export const THROTTLE_MAX_TAPS = 8;
export const RECENTLY_SHOWN_MAX = 10;
export const POOL_STALE_MS = 28800000; // 8 hours — refetch pool after this
export const WALK_RESULTS_THRESHOLD = 25;
export const CLOSING_SOON_EXCLUDE_MIN = 30;
export const CLOSING_SOON_WARN_MIN = 60;
export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440;
export const DAYS_PER_WEEK = 7;
export const OVERNIGHT_CUTOFF_MIN = 360;
export const WALK_CLOSE_RADIUS = 0.25;

// Layout & sizing
export const MILES_TO_METERS = 1609.34;
export const SPOTS_SEARCH_THRESHOLD = 5;
export const SCROLL_THUMB_PERCENT = 70;

// HTTP status codes
export const HTTP_TOO_MANY_REQUESTS = 429;

// Animation & UI timing
export const BOUNCE_OFFSET = -5;
export const DEFAULT_TOAST_MS = TOAST_DEFAULT;
export const THROTTLE_TOAST_MS = 2000;
export const FORK_COOLDOWN_MS = 1000;
export const ADDED_TOAST_MS = 2000;
export const SPOTS_ERROR_TOAST_MS = 3000;
export const WALK_SUGGEST_DELAY = 2500;
export const SUPPORT_MODAL_DELAY = 300;
export const SLOT_BASE_DELAY = 45;
export const SLOT_INCREMENT = 6;
export const SLOT_MIN_CYCLES = 10;
export const SLOT_MAX_CYCLES = 16;
export const DRAMATIC_PAUSE = 250;
export const FAV_TOAST_MS = 1400;
export const REVIEW_REQUEST_DELAY = 2000;

// Rating thresholds
export const RATING_LOW = 3.5;
export const RATING_DEFAULT = 4.0;
export const RATING_HIGH = 4.3;
export const RATING_TOP = 4.5;

// Walk mode radius thresholds
export const WALK_RADIUS_MAX = 1.5;
export const WALK_RADIUS_DEFAULT = 0.5;
export const DRIVE_RADIUS_MIN = 1;
export const DRIVE_RADIUS_DEFAULT = 3;
export const RADIUS_CLAMP_MIN = 0.25;
export const RADIUS_CLAMP_MAX = 15;

// Title font sizing
export const TITLE_FONT_SIZE = 46;
export const TITLE_LINE_HEIGHT = 54;
export const EASTER_EGG_TAPS = 7;

// Free tier limits — resets on the 1st of each month
export const FREE_SOLO_FORKS = 10;
export const FREE_GROUP_FORKS = 1;
export const FREE_FORKS_NUDGE_THRESHOLD = 5; // soft nudge after this many

// Pro tier limits
export const PRO_SOLO_FORKS = 20;
export const PRO_GROUP_FORKS = 3;

// Fallback price labels — used when store product fetch fails
// Bare-price constants (no period suffix) feed the paywall, which appends "/mo" or "/yr".
// Label constants (with suffix) feed body copy that needs the full form.
export const PRO_PRICE_MONTHLY = '$1.99';
export const PRO_PRICE_ANNUAL = '$14.99';
export const PRO_PLUS_PRICE_MONTHLY = '$2.99';
export const PRO_PLUS_PRICE_ANNUAL = '$24.99';
export const PRO_PRICE_LABEL = '$1.99/month';
export const PRO_PRICE_ANNUAL_LABEL = '$14.99/year';
export const PRO_PLUS_PRICE_LABEL = '$2.99/month';
export const PRO_PLUS_PRICE_ANNUAL_LABEL = '$24.99/year';

export const REVIEW_FORK_THRESHOLD = 5;

// IAP product IDs — must match App Store Connect / Google Play Console
// Apple uses separate product IDs per billing period.
// Google uses a single subscription ID with base plans for monthly/annual.
export const IAP_SKUS_IOS = {
  PRO_MONTHLY: 'com.ctuckersolutions.forkit.pro.monthly',
  PRO_ANNUAL: 'com.ctuckersolutions.forkit.pro.annual',
  PRO_PLUS_MONTHLY: 'com.ctuckersolutions.forkit.pro_plus.monthly',
  PRO_PLUS_ANNUAL: 'com.ctuckersolutions.forkit.pro_plus.annual',
};
export const IAP_SKUS_ANDROID = {
  PRO: 'forkit_pro',
  PRO_PLUS: 'forkit_pro_plus',
};
export const IAP_SKUS = Platform.OS === 'ios' ? IAP_SKUS_IOS : IAP_SKUS_ANDROID;
export const IAP_ALL_SKUS = Object.values(IAP_SKUS);

// Tour
export const TOUR_VERSION = 5; // Bump to re-show tour after major feature additions
export const TOUR_STEP_COUNT = 6;
export const TOUR_LAUNCH_DELAY = 800;
export const TOUR_EXPAND_DELAY = 350;
export const TOUR_ARROW_OFFSET = 30;
export const TOUR_SPOT_PAD = 6;
export const TOUR_SPOT_RADIUS = 14;

// Fork Around
export const GROUP_MODAL_CLOSE_DELAY = 300;
export const GROUP_POLL_INTERVAL = 3000; // 3s — balances responsiveness with rate limit budget (20 polls/min)
export const GROUP_RESULT_EXPIRY_MS = 30 * 60 * 1000; // eslint-disable-line no-magic-numbers -- 30 minutes
export const GROUP_RESULT_TICK_MS = 60000; // 1 minute countdown tick
export const TOUR_SCROLL_DELAY_MS = 400;
export const GROUP_SESSION_EXPIRED_STATUS = 410;

// Hidden Gems
export const HIDDEN_GEMS_MAX_REVIEWS = 500;

// Location cache TTL — matches privacy policy claim of 1-hour expiry
export const LOCATION_CACHE_TTL_MS = 3600000; // 1 hour
