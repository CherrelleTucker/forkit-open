// useUsage — Fork usage tracking, subscription via react-native-iap, and paywall logic.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  getAvailablePurchases,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  acknowledgePurchaseAndroid,
} from 'react-native-iap';

import {
  IAP_SKUS,
  IAP_ALL_SKUS,
  PRO_PRICE_MONTHLY,
  PRO_PRICE_ANNUAL,
  PRO_PLUS_PRICE_MONTHLY,
  PRO_PLUS_PRICE_ANNUAL,
  TOAST_LONG,
  TOAST_DEFAULT,
  FREE_FORKS_NUDGE_THRESHOLD,
} from '../constants/config';
import { STORAGE_KEYS } from '../constants/storage';
import { safeStore } from '../utils/helpers';

import {
  shouldResetUsage,
  buildResetUsage,
  isQuotaExceeded,
  calcAnnualSavings,
  tierFromProductId,
  buildIncrementedUsage,
} from './usageHelpers';

/**
 * Hook that manages fork usage quotas, IAP subscription status, and paywall.
 * @param {object} opts
 * @param {(text: string, kind: string, ms: number) => void} opts.showToast - Toast function
 * @param {(title: string, message?: string, buttons?: Array) => void} opts.showDialog - Branded dialog function
 * @returns {object} Usage state and functions
 */
// eslint-disable-next-line max-lines-per-function -- usage hook managing quotas, IAP, and paywall state
export default function useUsage({ showToast, showDialog }) {
  const [forkUsage, setForkUsage] = useState({ solo: 0, group: 0, month: 0, year: 0 });
  const [isProActive, setIsProActive] = useState(false);
  const [isProPlusActive, setIsProPlusActive] = useState(false);
  // Subscription dates — react-native-iap doesn't provide these directly.
  // Kept for InfoModal compatibility; always null until a date source is added.
  const [proSinceDate] = useState(null);
  const [proRenewDate] = useState(null);
  // CRITICAL — Revenue Gate: guards all purchase/restore calls. If false, store not connected.
  const iapReady = useRef(false);
  const [products, setProducts] = useState({}); // keyed by productId
  const [offeringPrices, setOfferingPrices] = useState({
    monthly: '',
    annual: '',
    proPlusMonthly: '',
    proPlusAnnual: '',
  });

  // CRITICAL — Revenue Gate: load persisted usage on mount. Without this, usage resets
  // every app launch, giving free users unlimited searches.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.FORK_USAGE);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed) setForkUsage(parsed);
        }
      } catch (_) {
        // Non-critical
      }
    })();
  }, []);

  // Initialize IAP connection and check existing purchases
  // eslint-disable-next-line max-lines-per-function -- IAP init with platform-specific pricing logic and retry
  useEffect(() => {
    // CRITICAL — Platform Gate: IAP is native-only. Web has no store connection.
    // Also prevents free usage bypass via web (no paywall on web = business model gate).
    if (Platform.OS === 'web') return undefined;

    let purchaseListener;
    let errorListener;

    const IAP_MAX_RETRIES = 3;
    const IAP_RETRY_BASE_MS = 2000;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    /**
     * Attempt initConnection with retries and exponential backoff.
     * @returns {Promise<boolean>} true on success, false after all attempts exhausted.
     */
    const connectWithRetry = async () => {
      for (let attempt = 1; attempt <= IAP_MAX_RETRIES; attempt++) {
        try {
          await initConnection();
          iapReady.current = true;
          Sentry.addBreadcrumb({
            category: 'iap',
            message: `initConnection succeeded on attempt ${attempt}`,
            level: 'info',
          });
          return true;
        } catch (e) {
          Sentry.addBreadcrumb({
            category: 'iap',
            message: `initConnection attempt ${attempt}/${IAP_MAX_RETRIES} failed`,
            level: 'warning',
            data: { error: e.message, code: e.code },
          });
          if (attempt < IAP_MAX_RETRIES) {
            await sleep(IAP_RETRY_BASE_MS * Math.pow(2, attempt - 1));
          } else {
            Sentry.captureException(e, {
              tags: { component: 'iap', action: 'initConnection' },
              extra: { message: e.message, code: e.code, attempts: IAP_MAX_RETRIES },
            });
          }
        }
      }
      return false;
    };

    const initIAP = async () => {
      const connected = await connectWithRetry();
      if (!connected) return;

      // Fetch subscription products and cache prices
      try {
        const subs = await fetchProducts({ skus: IAP_ALL_SKUS });
        const productMap = {};
        for (const sub of subs) {
          productMap[sub.productId] = sub;
        }
        setProducts(productMap);

        if (Platform.OS === 'ios') {
          const proMo = productMap[IAP_SKUS.PRO_MONTHLY];
          const proYr = productMap[IAP_SKUS.PRO_ANNUAL];
          const ppMo = productMap[IAP_SKUS.PRO_PLUS_MONTHLY];
          const ppYr = productMap[IAP_SKUS.PRO_PLUS_ANNUAL];
          setOfferingPrices({
            monthly: proMo?.localizedPrice || '',
            annual: proYr?.localizedPrice || '',
            proPlusMonthly: ppMo?.localizedPrice || '',
            proPlusAnnual: ppYr?.localizedPrice || '',
          });
        } else {
          // Android: subscriptions have base plans with offer details.
          // Play Console reports billing periods in ISO 8601 — accept P1Y or P12M for annual
          // since either can appear depending on how the base plan was configured.
          const isMonthly = (p) => p === 'P1M';
          const isAnnual = (p) => p === 'P1Y' || p === 'P12M';
          const findOffer = (offers, match) =>
            offers.find((o) => match(o.pricingPhases?.pricingPhaseList?.[0]?.billingPeriod));
          const proSub = productMap[IAP_SKUS.PRO];
          const ppSub = productMap[IAP_SKUS.PRO_PLUS];
          const proOffers = proSub?.subscriptionOfferDetails || [];
          const ppOffers = ppSub?.subscriptionOfferDetails || [];
          const proMoOffer = findOffer(proOffers, isMonthly);
          const proYrOffer = findOffer(proOffers, isAnnual);
          const ppMoOffer = findOffer(ppOffers, isMonthly);
          const ppYrOffer = findOffer(ppOffers, isAnnual);
          setOfferingPrices({
            monthly: proMoOffer?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice || '',
            annual: proYrOffer?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice || '',
            proPlusMonthly: ppMoOffer?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice || '',
            proPlusAnnual: ppYrOffer?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice || '',
          });
        }
      } catch (e) {
        Sentry.addBreadcrumb({
          category: 'iap',
          message: 'fetchProducts failed',
          level: 'warning',
          data: { error: e.message },
        });
      }

      // Check for active subscriptions
      await checkActivePurchases();

      // CRITICAL — Revenue Gate: listens for completed transactions, updates Pro state,
      // and finalizes with the store. Removing this = user pays but app never unlocks Pro.
      purchaseListener = purchaseUpdatedListener(async (purchase) => {
        if (purchase.transactionReceipt) {
          const tier = tierFromProductId(purchase.productId);
          if (tier === 'pro_plus') {
            setIsProActive(true);
            setIsProPlusActive(true);
          } else if (tier === 'pro') {
            setIsProActive(true);
          }
          // CRITICAL — Store Compliance: finishTransaction tells the store the purchase is
          // acknowledged. Without this, the store considers the transaction unfinished and
          // may refund or ban the app.
          await finishTransaction({ purchase, isConsumable: false });
          closePaywall();
          if (tier === 'pro_plus') {
            showToast('Welcome to Pro+! Unlimited searches unlocked.', 'success', TOAST_LONG);
          } else if (tier === 'pro') {
            showToast('Welcome to Pro! More forks unlocked.', 'success', TOAST_LONG);
          }
        }
      });

      errorListener = purchaseErrorListener((error) => {
        if (error.responseCode === 1 || error.code === 'E_USER_CANCELLED') return; // User cancelled
        showToast('Purchase failed. Please try again.', 'warn', TOAST_DEFAULT);
      });
    };

    initIAP();
    return () => {
      purchaseListener?.remove();
      errorListener?.remove();
      if (iapReady.current) endConnection();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- init once on mount

  // Re-check subscription status (and retry IAP connection if needed) on foreground
  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      if (iapReady.current) {
        await checkActivePurchases();
      } else {
        // IAP init failed earlier — retry on foreground
        try {
          await initConnection();
          iapReady.current = true;
          Sentry.addBreadcrumb({
            category: 'iap',
            message: 'initConnection succeeded on foreground retry',
            level: 'info',
          });
          await checkActivePurchases();
        } catch (_) {
          // Still not available — will retry next foreground
        }
      }
    });
    return () => sub.remove();
  }, []);

  /**
   * Query the store for active subscriptions and update Pro state.
   */
  async function checkActivePurchases() {
    try {
      const purchases = await getAvailablePurchases();
      let hasPro = false;
      let hasProPlus = false;
      for (const p of purchases) {
        const tier = tierFromProductId(p.productId);
        if (tier === 'pro_plus') hasProPlus = true;
        if (tier === 'pro') hasPro = true;
        // Acknowledge unfinished purchases (e.g., promo codes redeemed outside the app).
        // Without this, Google Play shows "Confirm plan" indefinitely and may auto-cancel.
        if (Platform.OS === 'android' && p.purchaseToken && !p.isAcknowledgedAndroid) {
          Sentry.addBreadcrumb({
            category: 'iap',
            message: 'Acknowledging unacknowledged purchase',
            level: 'info',
            data: { productId: p.productId },
          });
          acknowledgePurchaseAndroid(p.purchaseToken).catch(() => {});
        } else if (p.transactionReceipt && !p.isAcknowledgedAndroid) {
          finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
        }
      }
      setIsProActive(hasPro || hasProPlus);
      setIsProPlusActive(hasProPlus);
    } catch (e) {
      Sentry.addBreadcrumb({
        category: 'iap',
        message: 'checkActivePurchases failed',
        level: 'warning',
        data: { error: e.message },
      });
    }
  }

  function isPro() {
    return isProActive;
  }

  function isProPlus() {
    return isProPlusActive;
  }

  async function refreshPro() {
    if (!iapReady.current) return;
    await checkActivePurchases();
  }

  /**
   * Get the current month's usage, auto-resetting if the month has changed.
   * @returns {{solo: number, group: number, month: number, year: number}}
   */
  function getCurrentUsage() {
    if (!shouldResetUsage(forkUsage)) return forkUsage;
    const reset = buildResetUsage();
    setForkUsage(reset);
    safeStore(STORAGE_KEYS.FORK_USAGE, reset);
    return reset;
  }

  /**
   * Increment the fork usage counter and persist it.
   * @param {'solo' | 'group'} type - which counter to increment
   */
  const nudgeShownRef = useRef(false);

  function incrementUsage(type) {
    const current = getCurrentUsage();
    const updated = buildIncrementedUsage(current, type);
    setForkUsage(updated);
    safeStore(STORAGE_KEYS.FORK_USAGE, updated);

    if (
      type === 'solo' &&
      !isPro() &&
      !nudgeShownRef.current &&
      current.solo < FREE_FORKS_NUDGE_THRESHOLD &&
      updated.solo >= FREE_FORKS_NUDGE_THRESHOLD
    ) {
      nudgeShownRef.current = true;
      showToast('Enjoying ForkIt? Upgrade for more searches.', 'info', TOAST_LONG);
    }
  }

  /**
   * Check if the user has quota for the given fork type. Shows paywall if not.
   * @param {'solo' | 'group'} type - which quota to check
   * @returns {boolean} true if allowed
   */
  // CRITICAL — Revenue Gate: hard limit on free tier (10 solo, 1 group per month).
  // Without this, free users fork unlimited and the entire business model collapses.
  function checkQuota(type) {
    const usage = getCurrentUsage();
    if (!isQuotaExceeded(type, usage, isPro(), isProPlus())) return true;
    showPaywall(type);
    return false;
  }

  // ── Paywall state ──

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallContext, setPaywallContext] = useState('solo');

  function showPaywall(type) {
    if (Platform.OS === 'web') return;
    if (__DEV__ && !iapReady.current) {
      showDialog('Dev Mode', 'Paywall bypassed — IAP not available in dev.');
      return;
    }
    setPaywallContext(type || 'solo');
    setPaywallVisible(true);
  }

  function closePaywall() {
    setPaywallVisible(false);
  }

  /**
   * Find the offer token for a Google Play subscription base plan by billing period.
   * @param {string} subscriptionId - Google Play subscription ID
   * @param {string} period - billing period ('P1M' for monthly, 'P1Y' for annual)
   * @returns {string|null} offer token or null
   */
  function getAndroidOfferToken(subscriptionId, period) {
    const sub = products[subscriptionId]; // eslint-disable-line security/detect-object-injection -- subscriptionId is from IAP_SKUS constant
    const offers = sub?.subscriptionOfferDetails || [];
    const offer = offers.find(
      (o) => o.pricingPhases?.pricingPhaseList?.[0]?.billingPeriod === period,
    );
    return offer?.offerToken || null;
  }

  /**
   * Request a subscription purchase from the store.
   * @param {string} sku - product ID (iOS) or subscription ID (Android)
   * @param {string} [offerToken] - Android offer token for the specific base plan
   */
  // CRITICAL — Platform Gate: iOS and Android use fundamentally different purchase APIs.
  // iOS: separate product IDs per period (pro.monthly, pro.annual).
  // Android: single subscription ID with base plans + offer tokens.
  // Mixing paths = wrong product purchased or API rejection.
  async function purchaseSubscription(sku, offerToken) {
    if (!iapReady.current) {
      showToast('Store connection unavailable. Please try again shortly.', 'warn', TOAST_DEFAULT);
      return;
    }
    try {
      if (Platform.OS === 'ios') {
        await requestPurchase({
          request: { apple: { sku } },
          type: 'subs',
        });
      } else {
        await requestPurchase({
          request: {
            google: {
              skus: [sku],
              ...(offerToken ? { offerToken } : {}),
            },
          },
          type: 'subs',
        });
      }
      // purchaseUpdatedListener handles the rest
    } catch (e) {
      if (e?.code === 'E_USER_CANCELLED') return;
      Sentry.addBreadcrumb({
        category: 'iap',
        message: 'requestPurchase failed',
        level: 'error',
        data: { sku, error: e.message },
      });
      showToast('Purchase failed. Please try again.', 'warn', TOAST_DEFAULT);
    }
  }

  async function purchaseMonthly() {
    if (Platform.OS === 'ios') {
      await purchaseSubscription(IAP_SKUS.PRO_MONTHLY);
    } else {
      await purchaseSubscription(IAP_SKUS.PRO, getAndroidOfferToken(IAP_SKUS.PRO, 'P1M'));
    }
  }
  async function purchaseAnnual() {
    if (Platform.OS === 'ios') {
      await purchaseSubscription(IAP_SKUS.PRO_ANNUAL);
    } else {
      await purchaseSubscription(IAP_SKUS.PRO, getAndroidOfferToken(IAP_SKUS.PRO, 'P1Y'));
    }
  }
  async function purchaseProPlusMonthly() {
    if (Platform.OS === 'ios') {
      await purchaseSubscription(IAP_SKUS.PRO_PLUS_MONTHLY);
    } else {
      await purchaseSubscription(IAP_SKUS.PRO_PLUS, getAndroidOfferToken(IAP_SKUS.PRO_PLUS, 'P1M'));
    }
  }
  async function purchaseProPlusAnnual() {
    if (Platform.OS === 'ios') {
      await purchaseSubscription(IAP_SKUS.PRO_PLUS_ANNUAL);
    } else {
      await purchaseSubscription(IAP_SKUS.PRO_PLUS, getAndroidOfferToken(IAP_SKUS.PRO_PLUS, 'P1Y'));
    }
  }

  /**
   * Restore previous purchases from the store.
   */
  async function restorePurchase() {
    closePaywall();
    if (!iapReady.current) {
      showToast('Store connection unavailable. Please try again shortly.', 'warn', TOAST_DEFAULT);
      return;
    }
    try {
      const purchases = await getAvailablePurchases();
      let restored = null;
      for (const p of purchases) {
        const tier = tierFromProductId(p.productId);
        if (tier === 'pro_plus') {
          restored = 'pro_plus';
          break;
        }
        if (tier === 'pro') restored = 'pro';
      }
      if (restored === 'pro_plus') {
        const wasAlready = isProPlusActive;
        setIsProActive(true);
        setIsProPlusActive(true);
        showToast(
          wasAlready ? 'Pro+ is already active.' : 'Pro+ restored! Welcome back.',
          'success',
          TOAST_LONG,
        );
      } else if (restored === 'pro') {
        const wasAlready = isProActive;
        setIsProActive(true);
        showToast(
          wasAlready ? 'Pro is already active.' : 'Pro restored! Welcome back.',
          'success',
          TOAST_LONG,
        );
      } else {
        showToast('No active subscription found.', 'warn', TOAST_DEFAULT);
      }
    } catch (e) {
      Sentry.addBreadcrumb({
        category: 'iap',
        message: 'restorePurchase failed',
        level: 'error',
        data: { error: e.message },
      });
      showToast('Restore failed. Please try again.', 'warn', TOAST_DEFAULT);
    }
  }

  // Build paywallData for backwards compatibility with PaywallModal props
  const proMo = products[IAP_SKUS.PRO_MONTHLY];
  const proYr = products[IAP_SKUS.PRO_ANNUAL];
  const ppMo = products[IAP_SKUS.PRO_PLUS_MONTHLY];
  const ppYr = products[IAP_SKUS.PRO_PLUS_ANNUAL];

  const paywallData = {
    monthlyPrice: offeringPrices.monthly || PRO_PRICE_MONTHLY,
    annualPrice: offeringPrices.annual || PRO_PRICE_ANNUAL,
    proPlusMonthlyPrice: offeringPrices.proPlusMonthly || PRO_PLUS_PRICE_MONTHLY,
    proPlusAnnualPrice: offeringPrices.proPlusAnnual || PRO_PLUS_PRICE_ANNUAL,
    annualSavings: calcAnnualSavings(proMo?.price, proYr?.price),
    proPlusAnnualSavings: calcAnnualSavings(ppMo?.price, ppYr?.price),
    context: paywallContext,
  };

  return {
    forkUsage,
    isProActive,
    isProPlusActive,
    isPro,
    isProPlus,
    proSinceDate,
    proRenewDate,
    refreshPro,
    getCurrentUsage,
    incrementUsage,
    checkQuota,
    showPaywall,
    paywallVisible,
    paywallData,
    offeringPrices,
    closePaywall,
    restorePurchase,
    purchaseMonthly,
    purchaseAnnual,
    purchaseProPlusMonthly,
    purchaseProPlusAnnual,
  };
}
