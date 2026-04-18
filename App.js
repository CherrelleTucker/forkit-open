// ForkIt — Main app (App.js)

import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import * as Sentry from '@sentry/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  LogBox,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BlockedModal from './components/BlockedModal';
import Chip from './components/Chip';
import ConfirmDialog from './components/ConfirmDialog';
import CustomPlacesModal from './components/CustomPlacesModal';
import FavoritesModal from './components/FavoritesModal';
import FeaturePills from './components/FeaturePills';
import ForkIcon from './components/ForkIcon';
import GhostButton from './components/GhostButton';
import GlassCard from './components/GlassCard';
import GroupForkModal from './components/GroupForkModal';
import HistoryModal from './components/HistoryModal';
import InfoModal from './components/InfoModal';
import LocationSearchSection from './components/LocationSearchSection';
import PaywallModal from './components/PaywallModal';
import PrimaryButton from './components/PrimaryButton';
import Toast from './components/Toast';
import TourOverlay from './components/TourOverlay';
import UsageHint from './components/UsageHint';
import {
  TOAST_SHORT,
  TOAST_DEFAULT,
  RATING_LOW,
  RATING_DEFAULT,
  RATING_HIGH,
  RATING_TOP,
  TITLE_FONT_SIZE,
  TITLE_LINE_HEIGHT,
  GROUP_RESULT_EXPIRY_MS,
  GROUP_RESULT_TICK_MS,
  PRO_PRICE_MONTHLY,
  PRO_GROUP_FORKS,
  FREE_GROUP_FORKS,
  DEFAULT_TOAST_MS,
  FAV_TOAST_MS,
} from './constants/config';
import { THEME, scale } from './constants/theme';
import useDeepLink from './hooks/useDeepLink';
import useFilters from './hooks/useFilters';
import useForkEngine from './hooks/useForkEngine';
import useGroupSession from './hooks/useGroupSession';
import useLocation from './hooks/useLocation';
import useNetworkStatus from './hooks/useNetworkStatus';
import useTour from './hooks/useTour';
import useUsage from './hooks/useUsage';
import useUserData from './hooks/useUserData';
import { checkAppVersion } from './utils/api';
import { blockPlace } from './utils/blocked';
import { toggleFavorite } from './utils/favorites';
import { dollars, openMapsSearchByText, callPhone } from './utils/helpers';
import { haptics } from './utils/platform';

// Suppress IAP "purchase cancelled" console errors — normal user flow, not an error
LogBox.ignoreLogs(['[IAP]']);

// Sentry crash reporting — errors only, no user tracking
Sentry.init({
  dsn: 'https://853c52dcc5a798c84f39f8747097d3f7@o4511044289495040.ingest.us.sentry.io/4511044290805760',
  enabled: !__DEV__,
  beforeSend(event) {
    // Strip PII: remove user IP, email, and location data
    if (event.user) {
      delete event.user.ip_address;
      delete event.user.email;
      delete event.user.username;
      delete event.user.geo;
    }
    // Scrub breadcrumb data that might contain user input or location
    if (event.breadcrumbs) {
      const sensitiveKeys = [
        'body',
        'query',
        'search',
        'latitude',
        'longitude',
        'lat',
        'lng',
        'coords',
        'address',
        'location',
        'input',
      ];
      for (const crumb of event.breadcrumbs) {
        if (!crumb.data) continue;
        // Strip query params from URLs
        if (crumb.data.url) {
          try {
            const url = new URL(crumb.data.url);
            url.search = '';
            crumb.data.url = url.toString();
          } catch (_) {
            // Not a valid URL — leave as-is
          }
        }
        // Remove sensitive data fields
        for (const key of sensitiveKeys) {
          delete crumb.data[key]; // eslint-disable-line security/detect-object-injection -- iterating known safe array
        }
      }
    }
    // Strip location from event context
    if (event.contexts?.device) {
      delete event.contexts.device.location;
    }
    return event;
  },
});

// Cap font scaling so large-font accessibility settings don't break the layout.
const MAX_FONT_SCALE = 1.3;
if (Text.defaultProps === null || Text.defaultProps === undefined) Text.defaultProps = {};
Text.defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE;
if (TextInput.defaultProps === null || TextInput.defaultProps === undefined)
  TextInput.defaultProps = {};
TextInput.defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE;

// ==============================
// APP
// ==============================

/**
 * Banner displaying the group fork result with a countdown timer.
 * @param {object} props
 * @param {string} props.groupCode - The 4-letter group session code
 * @param {string} props.resultName - Name of the picked restaurant
 * @param {number} props.resultTime - Timestamp (ms) when the result was picked
 * @param {boolean} props.isHost - Whether the current user is the session host
 * @param {() => void} props.onPress - Handler when the banner is tapped
 * @returns {JSX.Element}
 */
function ResultBanner({ groupCode, resultName, resultTime, isHost, onPress }) {
  const [minsLeft, setMinsLeft] = useState(() =>
    resultTime
      ? Math.max(
          0,
          Math.ceil((GROUP_RESULT_EXPIRY_MS - (Date.now() - resultTime)) / GROUP_RESULT_TICK_MS),
        )
      : 30,
  );

  useEffect(() => {
    if (!resultTime) return undefined;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((GROUP_RESULT_EXPIRY_MS - (Date.now() - resultTime)) / GROUP_RESULT_TICK_MS),
      );
      setMinsLeft(remaining);
    }, GROUP_RESULT_TICK_MS);
    return () => clearInterval(interval);
  }, [resultTime]);

  return (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="View the group's restaurant pick"
    >
      <View style={styles.resultCardHeader}>
        <Ionicons name="restaurant" size={18} color={THEME.pop} />
        <Text style={styles.resultCardName} numberOfLines={2}>
          {resultName}
        </Text>
      </View>
      <Text style={styles.resultCardMeta}>
        {groupCode} · {isHost ? 'Hosted' : 'Joined'} · Info card expires in {minsLeft}{' '}
        {minsLeft === 1 ? 'minute' : 'minutes'}
      </Text>
      <View style={styles.resultCardCta}>
        <Text style={styles.resultCardCtaText}>Let's Forking Go!</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Main ForkIt app component — orchestrates all screens, modals, and state.
 * @returns {JSX.Element}
 */
// eslint-disable-next-line sonarjs/cognitive-complexity -- main app orchestrator with inherent complexity
export default Sentry.wrap(() => {
  // Load Montserrat Bold font
  const [fontsLoaded] = useFonts({
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  // ──── App-level UI state ────
  const [statusLine, setStatusLine] = useState('Hungry? Just pick already.');
  const [forkingLine, setForkingLine] = useState('');
  const [toast, setToast] = useState({ text: '', kind: 'info' });
  const [dialog, setDialog] = useState({ visible: false, title: '', message: '', buttons: [] });
  const [showInfo, setShowInfo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const scrollViewRef = useRef(null);
  const resultCardRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const toastTimerRef = useRef(null);
  const apiFetchCountRef = useRef(0);

  function showToast(text, kind = 'info', ms = DEFAULT_TOAST_MS) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ text, kind });
    toastTimerRef.current = setTimeout(() => {
      setToast({ text: '', kind: 'info' });
      toastTimerRef.current = null;
    }, ms);
  }

  function showDialog(title, message, buttons) {
    setDialog({ visible: true, title, message: message || '', buttons: buttons || [] });
  }

  function closeDialog() {
    setDialog({ visible: false, title: '', message: '', buttons: [] });
  }

  // Cleanup toast timer on unmount
  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  // ──── Custom hooks ────

  // Network
  const { isConnected } = useNetworkStatus();

  // Location
  const { coords, ensureLocation } = useLocation({ showToast, showDialog });

  // Usage & Pro
  const {
    isPro,
    isProPlus,
    proRenewDate,
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
  } = useUsage({
    showToast,
    showDialog,
  });

  // Filters (after useUsage so isPro is available for tier-based defaults)
  const filters = useFilters({ coords, showToast, isPro: isPro() });

  // User data (favorites, blocked, custom places)
  const userData = useUserData({
    setTravelMode: filters.setTravelMode,
    setRadiusMiles: filters.setRadiusMiles,
    apiFetchCountRef,
  });

  // Fork engine
  const fork = useForkEngine({
    coords,
    ensureLocation,
    radiusMeters: filters.radiusMeters,
    radiusMiles: filters.radiusMiles,
    travelMode: filters.travelMode,
    setTravelMode: filters.setTravelMode,
    setRadiusMiles: filters.setRadiusMiles,
    cuisineKeyword: filters.cuisineKeyword,
    excludeKeyword: filters.excludeKeyword,
    openNow: filters.openNow,
    maxPrice: filters.maxPrice,
    minRating: filters.minRating,
    hiddenGems: filters.hiddenGems,
    customLocation: filters.customLocation,
    setFiltersExpanded: filters.setFiltersExpanded,
    favorites: userData.favorites,
    blockedIds: userData.blockedIds,
    customPlaces: userData.customPlaces,
    checkQuota,
    incrementUsage,
    getCurrentUsage,
    isPro: isPro(),
    showToast,
    showDialog,
    scrollViewRef,
    resultCardRef,
    setStatusLine,
    setForkingLine,
    apiFetchCountRef,
  });

  // Tour
  const {
    showTour,
    tourStep,
    tourSpotLayout,
    tourRefs,
    startTour,
    advanceTour,
    retreatTour,
    endTour,
  } = useTour({
    filtersExpanded: filters.filtersExpanded,
    setFiltersExpanded: filters.setFiltersExpanded,
    setForkMode: filters.setForkMode,
    scrollViewRef,
    scrollOffsetRef,
    showDialog,
  });

  // Group session
  const group = useGroupSession({
    ensureLocation,
    customLocation: filters.customLocation,
    checkQuota,
    incrementUsage,
    onResult: undefined,
  });

  // Deep link handling — open group modal with pre-filled code from invite links
  useDeepLink({
    setShowGroupModal: group.setShowGroupModal,
    setGroupJoinCode: group.setGroupJoinCode,
    resetGroupState: group.resetGroupState,
  });

  // Check if app version meets server minimum on launch
  useEffect(() => {
    (async () => {
      const { updateRequired } = await checkAppVersion();
      if (updateRequired) {
        const storeUrl =
          Platform.OS === 'ios'
            ? 'https://apps.apple.com/app/id6759990349'
            : 'https://play.google.com/store/apps/details?id=com.ctuckersolutions.forkit';
        showDialog(
          'Update Required',
          'A new version of ForkIt! is available. Please update to continue.',
          [{ text: 'Update Now', onPress: () => Linking.openURL(storeUrl) }],
        );
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wait for fonts to load
  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={THEME.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex1}>
      <LinearGradient colors={THEME.background} style={styles.flex1}>
        {isConnected === false && (
          <View style={styles.offlineBanner} accessibilityRole="alert">
            <Text style={styles.offlineBannerText}>No internet connection</Text>
          </View>
        )}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          onScroll={(e) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                Fork<Text style={styles.titleIt}>It</Text>
              </Text>
              <View
                style={styles.iconNudge}
                importantForAccessibility="no-hide-descendants"
                accessible={false}
              >
                <ForkIcon size={44} color={THEME.accent} rotation="0deg" />
              </View>
            </View>
            <Text style={styles.subtitle} numberOfLines={1} adjustsFontSizeToFit>
              RANDOM RESTAURANT PICKER
            </Text>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroLine}>
              {filters.forkMode === 'group' && statusLine === 'Hungry? Just pick already.'
                ? 'Host or join a group session.'
                : statusLine}{' '}
              <Text style={styles.heroBold}>✨</Text>
            </Text>

            {filters.forkMode === 'solo' ? (
              <View ref={tourRefs.forkBtn} collapsable={false}>
                <PrimaryButton
                  label={fork.loading ? 'Picking…' : 'Just Fork It'}
                  onPress={fork.forkIt}
                  disabled={fork.loading}
                  loading={fork.loading}
                  spinDeg={fork.spinDeg}
                  bounceY={fork.bounceY}
                />
              </View>
            ) : (
              <View ref={tourRefs.forkAroundBtn} collapsable={false}>
                <PrimaryButton
                  label="Fork Around"
                  icon="people"
                  onPress={() => {
                    if (group.groupStep === 'hosting' || group.groupStep === 'waiting') {
                      group.setShowGroupModal(true);
                      return;
                    }
                    group.resetGroupState();
                    group.setShowGroupModal(true);
                  }}
                  disabled={false}
                  loading={false}
                  spinDeg={fork.spinDeg}
                  bounceY={fork.bounceY}
                />
              </View>
            )}

            {!group.showGroupModal &&
              (group.groupStep === 'hosting' || group.groupStep === 'waiting') && (
                <TouchableOpacity
                  style={styles.activeSessionBanner}
                  onPress={() => group.setShowGroupModal(true)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Return to active Fork Around session"
                >
                  <Ionicons name="people" size={16} color={THEME.white} />
                  <Text style={styles.activeSessionText}>
                    {group.groupHostId ? 'Hosting' : 'Joined'} {group.groupCode} (tap to return)
                  </Text>
                </TouchableOpacity>
              )}

            {!fork.loading && (
              <UsageHint
                mode={filters.forkMode}
                usage={getCurrentUsage()}
                isPro={isPro()}
                isProPlus={isProPlus()}
                onPaywall={showPaywall}
              />
            )}

            {!!forkingLine && fork.loading ? (
              <Text style={styles.forkingLine}>{forkingLine}</Text>
            ) : null}

            {!!fork.slotText && fork.loading ? (
              <View
                style={styles.slotBox}
                importantForAccessibility="no-hide-descendants"
                accessible={false}
              >
                <Text style={styles.slotLabel}>Picking...</Text>
                <Text style={styles.slotText} numberOfLines={1}>
                  {fork.slotText}
                </Text>
              </View>
            ) : null}

            {/* Collapsible Filters — hidden in group mode */}
            {filters.forkMode === 'group' ? (
              <Text style={styles.groupFiltersHint}>
                Set your filters after starting a session.
              </Text>
            ) : (
              <>
                <TouchableOpacity
                  ref={tourRefs.filtersToggle}
                  onPress={() => filters.setFiltersExpanded(!filters.filtersExpanded)}
                  activeOpacity={0.85}
                  style={styles.filtersToggle}
                  accessibilityRole="button"
                  accessibilityLabel={
                    filters.filtersExpanded ? 'Collapse filters' : 'Expand filters'
                  }
                  accessibilityState={{ expanded: filters.filtersExpanded }}
                >
                  <View style={styles.rowCenter}>
                    <Ionicons name="options" size={16} color={THEME.textBright} />
                    <Text style={styles.filtersToggleText} numberOfLines={1}>
                      Filters
                    </Text>
                    {!filters.filtersExpanded && fork.poolCount > 0 && (
                      <Text style={styles.filterCount}>{fork.poolCount} found</Text>
                    )}
                  </View>
                  <Ionicons
                    name={filters.filtersExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={THEME.textSubtle}
                  />
                </TouchableOpacity>

                {filters.filtersExpanded && (
                  <View style={styles.filtersContent}>
                    <Text style={styles.label}>How far?</Text>
                    <View ref={tourRefs.distanceRow} collapsable={false} style={styles.row}>
                      {(filters.travelMode === 'walk'
                        ? [
                            { v: 0.25, t: '¼ mi' },
                            { v: 0.5, t: '½ mi' },
                            { v: 1, t: '1 mi' },
                            { v: 1.5, t: '1½ mi' },
                          ]
                        : [
                            { v: 1, t: '1 mi' },
                            { v: 3, t: '3 mi' },
                            { v: 5, t: '5 mi' },
                            { v: 10, t: '10 mi' },
                          ]
                      ).map((m) => (
                        <Chip
                          key={m.v}
                          label={m.t}
                          icon="navigate"
                          active={filters.radiusMiles === m.v}
                          onPress={() => filters.setRadiusMiles(m.v)}
                        />
                      ))}
                      <Chip
                        label=""
                        icon="location"
                        active={!!filters.customLocation || filters.showLocationSearch}
                        onPress={() => {
                          if (filters.customLocation) {
                            filters.clearCustomLocation();
                          } else {
                            filters.setShowLocationSearch((v) => !v);
                          }
                        }}
                      />
                    </View>
                    <LocationSearchSection
                      customLocation={filters.customLocation}
                      showLocationSearch={filters.showLocationSearch}
                      locationQuery={filters.locationQuery}
                      locationSuggestions={filters.locationSuggestions}
                      onQueryChange={filters.handleLocationQueryChange}
                      onSelectSuggestion={filters.selectCustomLocation}
                      onCancel={() => {
                        filters.setShowLocationSearch(false);
                      }}
                    />

                    {/* CRITICAL — Revenue Gate: price, rating, and openNow filters are Pro-only.
                        Each filter's onPress checks isPro() → showPaywall() if free.
                        Removing these gates gives free users full filter access → revenue loss. */}
                    <View ref={tourRefs.maxDamageRow} collapsable={false}>
                      <View style={styles.labelRow}>
                        <Text style={styles.label}>Max damage</Text>
                        {!isPro() && <Text style={styles.proBadgeInline}>PRO</Text>}
                      </View>
                      <View style={[styles.row, !isPro() && styles.rowLocked]}>
                        {[
                          { v: 1, t: '$' },
                          { v: 2, t: '$$' },
                          { v: 3, t: '$$$' },
                          { v: 4, t: '$$$$' },
                        ].map((p) => (
                          <Chip
                            key={p.v}
                            label={p.t}
                            icon="pricetag"
                            active={isPro() && filters.maxPrice === p.v}
                            onPress={() =>
                              isPro() ? filters.setMaxPrice(p.v) : showPaywall('solo')
                            }
                          />
                        ))}
                      </View>
                    </View>

                    <View ref={tourRefs.ratingRow} collapsable={false}>
                      <View style={styles.labelRow}>
                        <Text style={styles.label}>At least this good</Text>
                        {!isPro() && <Text style={styles.proBadgeInline}>PRO</Text>}
                      </View>
                      <View style={[styles.row, !isPro() && styles.rowLocked]}>
                        {[RATING_LOW, RATING_DEFAULT, RATING_HIGH, RATING_TOP].map((r) => (
                          <Chip
                            key={r}
                            label={`${r}+`}
                            icon="star"
                            active={isPro() && filters.minRating === r}
                            onPress={() =>
                              isPro() ? filters.setMinRating(r) : showPaywall('solo')
                            }
                          />
                        ))}
                      </View>
                    </View>

                    <View ref={tourRefs.keywordFields} collapsable={false}>
                      <Text style={styles.label}>Cuisine keyword (optional)</Text>
                      <View style={styles.inputWrap}>
                        <Ionicons name="search" size={16} color={THEME.textSubtle} />
                        <TextInput
                          value={filters.cuisineKeyword}
                          onChangeText={filters.setCuisineKeyword}
                          placeholder="ramen, tacos, thai…"
                          placeholderTextColor={THEME.textFaint}
                          style={styles.input}
                          accessibilityLabel="Cuisine keyword filter"
                          returnKeyType="search"
                          keyboardAppearance="dark"
                          autoCorrect={false}
                          onSubmitEditing={fork.forkIt}
                        />
                      </View>

                      <Text style={styles.label}>Not in the mood for (optional)</Text>
                      <View style={styles.inputWrap}>
                        <Ionicons name="ban-outline" size={16} color={THEME.textSubtle} />
                        <TextInput
                          value={filters.excludeKeyword}
                          onChangeText={filters.setExcludeKeyword}
                          placeholder="pizza, indian, sushi…"
                          placeholderTextColor={THEME.textFaint}
                          style={styles.input}
                          accessibilityLabel="Exclude cuisine filter"
                          returnKeyType="search"
                          keyboardAppearance="dark"
                          autoCorrect={false}
                          onSubmitEditing={fork.forkIt}
                        />
                      </View>
                    </View>

                    <View ref={tourRefs.openNowRow} collapsable={false} style={styles.toggleRow}>
                      <View style={styles.labelRow}>
                        <Text style={styles.toggleLabel}>Open now</Text>
                        {!isPro() && <Text style={styles.proBadgeInline}>PRO</Text>}
                      </View>
                      <Chip
                        label={isPro() && filters.openNow ? 'ON' : 'OFF'}
                        icon="time"
                        active={isPro() && filters.openNow}
                        onPress={() =>
                          isPro() ? filters.setOpenNow((v) => !v) : showPaywall('solo')
                        }
                      />
                    </View>

                    <View ref={tourRefs.hiddenGemsRow} collapsable={false} style={styles.toggleRow}>
                      <Text style={styles.toggleLabel}>Skip the chains</Text>
                      <Chip
                        label={filters.hiddenGems ? 'ON' : 'OFF'}
                        icon="sparkles"
                        active={filters.hiddenGems}
                        onPress={() => filters.setHiddenGems((v) => !v)}
                      />
                    </View>

                    {fork.recentlyShown.length > 0 && (
                      <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>
                          Recently shown: {fork.recentlyShown.length}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            fork.setRecentlyShown([]);
                            showToast(
                              'History cleared! All restaurants available again.',
                              'success',
                              TOAST_DEFAULT,
                            );
                          }}
                          activeOpacity={0.85}
                          style={styles.clearBtn}
                          accessibilityRole="button"
                          accessibilityLabel={`Clear history, ${fork.recentlyShown.length} restaurants shown`}
                        >
                          <Ionicons
                            name="refresh"
                            size={12}
                            color={THEME.textAlmostWhite}
                            style={styles.iconMarginRight6}
                            importantForAccessibility="no"
                          />
                          <Text style={styles.clearBtnText}>Clear History</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}

            <View ref={tourRefs.spotsRow} collapsable={false}>
              <FeaturePills
                travelMode={filters.travelMode}
                onToggleTravel={() => {
                  const next = filters.travelMode === 'drive' ? 'walk' : 'drive';
                  filters.persistTravelMode(next);
                }}
                forkMode={filters.forkMode}
                onToggleFork={() => {
                  filters.setForkMode((m) => (m === 'solo' ? 'group' : 'solo'));
                  filters.setFiltersExpanded(false);
                }}
                favorites={userData.favorites}
                blockedIds={userData.blockedIds}
                onShowFavorites={() => userData.setShowFavorites(true)}
                onShowBlocked={() => userData.setShowBlocked(true)}
                onShowCustomPlaces={() => userData.setShowCustomPlaces(true)}
                tourRefsExt={tourRefs}
              />
            </View>
          </View>

          {/* Result - solo mode only (group results show in modal) */}
          {fork.picked && filters.forkMode === 'solo' ? (
            <View ref={resultCardRef} collapsable={false}>
              <GlassCard title="You're going here" icon="restaurant" accent>
                <>
                  <Text style={styles.placeName} accessibilityRole="header">
                    {fork.placeName}
                  </Text>

                  {fork.picked?.isCustom && (
                    <View style={styles.customBadge}>
                      <Ionicons
                        name="person"
                        size={10}
                        color={THEME.pop}
                        importantForAccessibility="no"
                      />
                      <Text style={styles.customBadgeText}>Your spot</Text>
                    </View>
                  )}

                  <View style={styles.metaRow}>
                    {isPro() && (
                      <>
                        <View
                          style={styles.metaPill}
                          accessibilityLabel={`Rating: ${fork.rating ? String(fork.rating) : 'not available'}`}
                        >
                          <Ionicons
                            name="star"
                            size={12}
                            color={THEME.pop}
                            importantForAccessibility="no"
                          />
                          <Text style={styles.metaText}>
                            {fork.rating ? String(fork.rating) : '—'}
                          </Text>
                        </View>
                        <View
                          style={styles.metaPill}
                          accessibilityLabel={`Price: ${dollars(fork.price)}`}
                        >
                          <Ionicons
                            name="cash"
                            size={12}
                            color={THEME.success}
                            importantForAccessibility="no"
                          />
                          <Text style={styles.metaText}>{dollars(fork.price)}</Text>
                        </View>
                      </>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        if (fork.isFavorite) {
                          showDialog(
                            'Remove Favorite',
                            `Remove "${fork.placeName}" from favorites?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove',
                                style: 'destructive',
                                onPress: () => {
                                  toggleFavorite(
                                    { place_id: fork.picked.place_id, name: fork.placeName },
                                    userData.favorites,
                                    userData.setFavorites,
                                  );
                                  showToast('Removed from favorites.', 'success', FAV_TOAST_MS);
                                  haptics.selectionAsync();
                                },
                              },
                            ],
                          );
                        } else {
                          toggleFavorite(
                            {
                              place_id: fork.picked.place_id,
                              name: fork.placeName,
                              vicinity: fork.vicinity,
                              rating: fork.rating,
                              price_level: fork.price,
                            },
                            userData.favorites,
                            userData.setFavorites,
                          );
                          showToast('Saved to favorites!', 'success', FAV_TOAST_MS);
                          haptics.selectionAsync();
                        }
                      }}
                      activeOpacity={0.85}
                      style={styles.metaIconBtn}
                      accessibilityRole="button"
                      accessibilityLabel={
                        fork.isFavorite ? 'Remove from favorites' : 'Save to favorites'
                      }
                    >
                      <Ionicons
                        name={fork.isFavorite ? 'heart' : 'heart-outline'}
                        size={16}
                        color={fork.isFavorite ? THEME.accent : THEME.textSubtle}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const doBlock = (byName) => {
                          blockPlace(fork.picked, {
                            currentBlocked: userData.blockedIds,
                            setBlocked: userData.setBlockedIds,
                            currentFavorites: userData.favorites,
                            setFavs: userData.setFavorites,
                            byName,
                          });
                          showToast(
                            byName
                              ? `Blocked all "${fork.placeName}" locations.`
                              : "Blocked. You won't see this one again.",
                            'info',
                            TOAST_DEFAULT,
                          );
                          haptics.notificationAsync(haptics.NotificationFeedbackType.Success);
                          fork.setPicked(null);
                          fork.setPickedDetails(null);
                        };
                        showDialog(
                          'Block Restaurant',
                          `How do you want to block ${fork.placeName}?`,
                          [
                            { text: 'Just This Location', onPress: () => doBlock(false) },
                            { text: 'All With This Name', onPress: () => doBlock(true) },
                            { text: 'Cancel', style: 'cancel' },
                          ],
                        );
                      }}
                      activeOpacity={0.85}
                      style={styles.metaIconBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Never show this restaurant again"
                    >
                      <Ionicons name="ban-outline" size={16} color={THEME.textSubtle} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.actionRow}>
                    <GhostButton
                      label={isPro() ? "Let's Go" : 'Open Details on Google'}
                      icon="map"
                      onPress={() =>
                        openMapsSearchByText(
                          fork.picked?.isCustom && fork.vicinity ? fork.vicinity : fork.placeName,
                        )
                      }
                    />
                    {isPro() && (
                      <>
                        <GhostButton
                          label={fork.detailsLoading ? 'Loading…' : 'Website'}
                          icon="globe"
                          onPress={async () => {
                            const details = fork.pickedDetails || (await fork.ensureDetails());
                            const url = details?.website;
                            if (!url) {
                              showToast('No website available', 'warn', TOAST_SHORT);
                              return;
                            }
                            const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
                            Linking.openURL(normalized).catch(() =>
                              showDialog('Error', 'Could not open website.'),
                            );
                          }}
                          disabled={fork.detailsLoading}
                        />
                        <GhostButton
                          label={fork.detailsLoading ? 'Loading…' : 'Call'}
                          icon="call"
                          onPress={async () => {
                            const details = fork.pickedDetails || (await fork.ensureDetails());
                            const phone = details?.formatted_phone_number;
                            if (!phone) {
                              showToast('No phone number available', 'warn', TOAST_SHORT);
                              return;
                            }
                            callPhone(phone);
                          }}
                          disabled={fork.detailsLoading}
                        />
                      </>
                    )}
                  </View>

                  {isPro() && fork.alternatives.length > 0 && (
                    <View style={styles.altSection}>
                      <Text style={styles.altLabel}>Not feeling it? Try these instead</Text>
                      <View style={styles.altCards}>
                        {fork.alternatives.map((alt) => (
                          <TouchableOpacity
                            key={alt.place_id}
                            style={styles.altCard}
                            onPress={() => fork.swapAlternative(alt)}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`Switch to ${alt.name || 'alternative'}`}
                          >
                            <Text style={styles.altCategory} numberOfLines={1}>
                              {(alt.types || [])
                                .find(
                                  (t) =>
                                    ![
                                      'restaurant',
                                      'food',
                                      'point_of_interest',
                                      'establishment',
                                      'store',
                                      'meal_delivery',
                                      'meal_takeaway',
                                    ].includes(t),
                                )
                                ?.replace(/_restaurant$/, '')
                                .replace(/_/g, ' ') || 'Dining'}
                            </Text>
                            <Text style={styles.altName} numberOfLines={1}>
                              {alt.name || 'Unknown'}
                            </Text>
                            <View style={styles.altMeta}>
                              {alt.rating !== null && alt.rating !== undefined && (
                                <Text style={styles.altMetaText}>
                                  <Text style={styles.altStar}>{'\u2605'}</Text> {alt.rating}
                                </Text>
                              )}
                              {alt.price_level !== null && alt.price_level !== undefined && (
                                <Text style={styles.altMetaText}>
                                  {'$'.repeat(alt.price_level)}
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {!isPro() && fork.picked && !fork.picked.isCustom && (
                    <TouchableOpacity
                      style={styles.altSection}
                      onPress={() => showPaywall('solo')}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Upgrade to Pro to see alternative picks"
                    >
                      <Text style={styles.altLabel}>Not feeling it?</Text>
                      <View style={styles.altCardsLocked}>
                        <View style={styles.altCardLocked}>
                          <Text style={styles.altCategoryGhost}>Italian</Text>
                          <Text style={styles.altNameGhost}>Trattoria Bella</Text>
                          <View style={styles.altMeta}>
                            <Text style={styles.altMetaGhost}>{'\u2605'} 4.5</Text>
                            <Text style={styles.altMetaGhost}>$$</Text>
                          </View>
                        </View>
                        <View style={styles.altCardLocked}>
                          <Text style={styles.altCategoryGhost}>Mexican</Text>
                          <Text style={styles.altNameGhost}>Casa de Tacos</Text>
                          <View style={styles.altMeta}>
                            <Text style={styles.altMetaGhost}>{'\u2605'} 4.2</Text>
                            <Text style={styles.altMetaGhost}>$$</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.altLockBadge}>
                        <Text style={styles.proBadgeInline}>PRO</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {!fork.picked?.isCustom && (
                    <>
                      <View style={styles.divider} />

                      <Text style={styles.altLabel}>Don't want to leave after all?</Text>
                      <Text style={styles.muted}>
                        {fork.signatureDish === 'Signature dish'
                          ? 'Copycat recipes. Close enough.'
                          : `Try making: ${fork.signatureDish}`}
                      </Text>

                      <View style={styles.spacer10} />
                      {fork.recipeLinks.map((l) => (
                        <TouchableOpacity
                          key={l.url}
                          onPress={() => Linking.openURL(l.url).catch(() => {})}
                          activeOpacity={0.85}
                          style={styles.linkRow}
                          accessibilityRole="link"
                          accessibilityLabel={`${l.label}, opens in browser`}
                        >
                          <View style={styles.rowCenter}>
                            <Ionicons
                              name={l.icon}
                              size={16}
                              color={THEME.pop}
                              importantForAccessibility="no"
                            />
                            <Text style={styles.linkText}>{l.label}</Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={THEME.popFaint}
                            importantForAccessibility="no"
                          />
                        </TouchableOpacity>
                      ))}

                      <Text style={styles.attribution}>Powered by Google</Text>
                    </>
                  )}
                </>
              </GlassCard>
            </View>
          ) : null}

          <View style={styles.footerRow}>
            <View style={styles.footerIcons}>
              <TouchableOpacity
                ref={tourRefs.infoBtn}
                onPress={() => setShowInfo(true)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="About ForkIt"
              >
                <Ionicons name="information-circle-outline" size={20} color={THEME.textHint} />
              </TouchableOpacity>
              <TouchableOpacity
                ref={tourRefs.historyBtn}
                onPress={() => setShowHistory(true)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Fork history"
              >
                <Ionicons name="time-outline" size={20} color={THEME.textHint} />
              </TouchableOpacity>
            </View>
            <Text style={styles.footer}>Life's too short to debate dinner.</Text>
          </View>

          {!group.showGroupModal && group.groupStep === 'result' && group.groupResult && (
            <View>
              <Text style={styles.resultSectionHeader}>Recent Fork Around</Text>
              <ResultBanner
                groupCode={group.groupCode}
                resultName={group.groupResult.name}
                resultTime={group.groupResultTime}
                isHost={!!group.groupHostId}
                onPress={() => group.setShowGroupModal(true)}
              />
            </View>
          )}
        </ScrollView>

        {/* Tour Spotlight Modal */}
        <TourOverlay
          visible={showTour}
          tourStep={tourStep}
          tourSpotLayout={tourSpotLayout}
          onAdvance={advanceTour}
          onRetreat={retreatTour}
          onClose={endTour}
          priceLabel={offeringPrices.monthly || PRO_PRICE_MONTHLY}
          onUpgrade={() => {
            endTour();
            showPaywall('solo');
          }}
        />

        <InfoModal
          visible={showInfo}
          onClose={() => setShowInfo(false)}
          isPro={isPro()}
          isProPlus={isProPlus()}
          proRenew={proRenewDate}
          usage={getCurrentUsage()}
          showPaywall={showPaywall}
          showToast={showToast}
          startTour={startTour}
          onDataImported={userData.reloadFromStorage}
          restorePurchase={restorePurchase}
        />

        {/* Fork Around Modal */}
        <GroupForkModal
          visible={group.showGroupModal}
          onClose={group.closeGroupModal}
          groupStep={group.groupStep}
          groupCode={group.groupCode}
          groupName={group.groupName}
          setGroupName={group.setGroupName}
          groupJoinCode={group.groupJoinCode}
          setGroupJoinCode={group.setGroupJoinCode}
          groupLocationName={group.groupLocationName}
          setGroupLocationName={group.setGroupLocationName}
          groupHostName={group.groupHostName}
          groupHostRadius={group.groupHostRadius}
          customPlaces={userData.customPlaces}
          setCustomPlaces={userData.setCustomPlaces}
          groupParticipants={group.groupParticipants}
          groupResult={group.groupResult}
          groupLoading={group.groupLoading}
          groupError={group.groupError}
          groupFiltersSubmitted={group.groupFiltersSubmitted}
          groupEditFilters={group.groupEditFilters}
          groupMeetUpTime={group.groupMeetUpTime}
          setGroupMeetUpTime={group.setGroupMeetUpTime}
          groupCreate={group.groupCreate}
          groupJoin={group.groupJoin}
          groupSubmitFilters={group.groupSubmitFilters}
          groupTriggerPick={group.groupTriggerPick}
          groupLeave={group.groupLeave}
          groupPollStale={group.groupPollStale}
          isHost={!!group.groupHostId}
          canHost={
            isProPlus() ||
            (isPro() && getCurrentUsage().group < PRO_GROUP_FORKS) ||
            getCurrentUsage().group < FREE_GROUP_FORKS
          }
          showPaywall={showPaywall}
        />

        {/* Favorites Modal */}
        <FavoritesModal
          visible={userData.showFavorites}
          onClose={() => userData.setShowFavorites(false)}
          favorites={userData.favorites}
          setFavorites={userData.setFavorites}
          showToast={showToast}
        />

        {/* Blocked Places Modal */}
        <BlockedModal
          visible={userData.showBlocked}
          onClose={() => userData.setShowBlocked(false)}
          blockedIds={userData.blockedIds}
          setBlockedIds={userData.setBlockedIds}
          showToast={showToast}
        />

        {/* Custom Places Modal */}
        <CustomPlacesModal
          visible={userData.showCustomPlaces}
          onClose={() => userData.setShowCustomPlaces(false)}
          customPlaces={userData.customPlaces}
          setCustomPlaces={userData.setCustomPlaces}
          coords={coords}
          showToast={showToast}
        />

        {/* History Modal */}
        <HistoryModal visible={showHistory} onClose={() => setShowHistory(false)} />

        {/* Paywall Modal */}
        <PaywallModal
          visible={paywallVisible}
          onClose={closePaywall}
          monthlyPrice={paywallData.monthlyPrice}
          annualPrice={paywallData.annualPrice}
          annualSavings={paywallData.annualSavings}
          proPlusMonthlyPrice={paywallData.proPlusMonthlyPrice}
          proPlusAnnualPrice={paywallData.proPlusAnnualPrice}
          proPlusAnnualSavings={paywallData.proPlusAnnualSavings}
          context={paywallData.context}
          onPurchaseMonthly={purchaseMonthly}
          onPurchaseAnnual={purchaseAnnual}
          onPurchaseProPlusMonthly={purchaseProPlusMonthly}
          onPurchaseProPlusAnnual={purchaseProPlusAnnual}
          onRestore={restorePurchase}
        />

        <ConfirmDialog
          visible={dialog.visible}
          title={dialog.title}
          message={dialog.message}
          buttons={dialog.buttons}
          onClose={closeDialog}
        />

        <Toast text={toast.text} kind={toast.kind} />
      </LinearGradient>
    </SafeAreaView>
  );
});

// ==============================
// STYLES
// ==============================

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: THEME.destructive,
    paddingVertical: 6,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: '700',
  },
  // eslint-disable-next-line no-magic-numbers -- layout padding values
  container: { padding: scale(16), paddingTop: scale(34), paddingBottom: scale(24) },

  header: { alignItems: 'center', marginBottom: scale(12), marginTop: scale(18) },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  title: {
    color: THEME.accent,
    fontSize: scale(TITLE_FONT_SIZE),
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.2,
    lineHeight: scale(TITLE_LINE_HEIGHT),
  },
  titleIt: { color: THEME.pop },
  subtitle: {
    color: THEME.textHint,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    textAlign: 'center',
    marginTop: 3,
  },

  hero: {
    padding: scale(14),
    borderRadius: 18,
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: THEME.borderFaint,
    backgroundColor: THEME.surfaceLight,
  },
  heroLine: { color: THEME.textBold, fontSize: 16, lineHeight: 22, marginBottom: 14 },
  heroBold: { color: THEME.white, fontWeight: '900' },

  forkingLine: {
    marginTop: 12,
    color: THEME.textNearWhite,
    fontSize: 15,
    fontWeight: '900',
  },
  groupFiltersHint: {
    color: THEME.textHint,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  activeSessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: THEME.pop,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 12,
  },
  activeSessionText: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: '700',
  },
  filtersToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    backgroundColor: THEME.surfaceLight,
  },
  filtersToggleText: {
    color: THEME.textBright,
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 10,
  },
  filterCount: {
    color: THEME.pop,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 12,
  },
  filtersContent: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.borderThin,
  },

  slotBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.borderFaint,
    backgroundColor: THEME.surfaceInput,
  },
  slotLabel: { color: THEME.textIcon, fontSize: 14, fontWeight: '800' },
  slotText: { marginTop: 7, color: THEME.textPrimary, fontSize: 16, fontWeight: '950' },

  label: { color: THEME.textSecondary, fontSize: 14, marginTop: 12, marginBottom: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proBadgeInline: {
    color: THEME.pop,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    backgroundColor: THEME.popBgMedium,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  rowLocked: { opacity: 0.45 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.borderMedium,
    backgroundColor: THEME.surfaceInput,
  },
  input: { color: THEME.white, flex: 1, fontWeight: '800' },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  toggleLabel: { color: THEME.textSecondary, fontSize: 14, fontWeight: '900' },

  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: THEME.surfaceClearBtn,
    borderWidth: 1,
    borderColor: THEME.borderHover,
  },
  clearBtnText: { color: THEME.textBright, fontSize: 13, fontWeight: '900' },

  placeName: {
    color: THEME.white,
    fontSize: scale(24),
    fontWeight: '950',
    marginTop: 3,
    marginBottom: scale(10),
  },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: scale(7), // eslint-disable-line no-magic-numbers -- layout spacing
    marginBottom: scale(12), // eslint-disable-line no-magic-numbers -- layout spacing
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.borderMedium,
    backgroundColor: THEME.surfaceLight,
    flexShrink: 1,
  },
  metaText: { color: THEME.textBold, fontWeight: '700', fontSize: 13 },

  actionRow: { flexDirection: 'row', gap: scale(8), flexWrap: 'wrap' },
  divider: { height: 1, backgroundColor: THEME.borderFaint, marginVertical: scale(10) },

  muted: { color: THEME.textSubtle, fontSize: 15, lineHeight: 22 },

  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(10),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.popBorder,
    backgroundColor: THEME.popBg,
    marginBottom: scale(8),
  },
  linkText: { color: THEME.textPrimary, fontWeight: '950', marginLeft: 10 },
  attribution: { color: THEME.textDimmed, fontSize: 13, textAlign: 'right', marginTop: 10 },

  footer: {
    marginTop: 7,
    textAlign: 'center',
    color: THEME.textHalf,
    fontSize: 14,
    lineHeight: 19,
  },
  resultSectionHeader: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 4,
  },
  resultCard: {
    borderWidth: 1.5,
    borderColor: THEME.popBorder,
    backgroundColor: THEME.surfaceLight,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  resultCardName: {
    color: THEME.white,
    fontSize: 17,
    fontWeight: '900',
    flex: 1,
  },
  resultCardMeta: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  resultCardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: THEME.popBg,
    borderWidth: 1,
    borderColor: THEME.popBorder,
  },
  resultCardCtaText: {
    color: THEME.pop,
    fontSize: 15,
    fontWeight: '800',
  },
  footerRow: { alignItems: 'center', marginTop: 4, marginBottom: 8 },

  metaIconBtn: {
    padding: 6,
    flexShrink: 0,
  },
  altSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.borderDim,
  },
  altLabel: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  altCards: {
    flexDirection: 'row',
    gap: 8,
  },
  altCard: {
    flex: 1,
    backgroundColor: THEME.surfaceLight,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    borderRadius: 12,
    padding: 12,
  },
  altCategory: {
    color: THEME.pop,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  altName: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  altMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  altMetaText: {
    color: THEME.textMuted,
    fontSize: 11,
  },
  altStar: {
    color: THEME.pop,
  },
  altCardsLocked: {
    flexDirection: 'row',
    gap: 8,
    opacity: 0.55,
  },
  altCardLocked: {
    flex: 1,
    backgroundColor: THEME.surfaceLight,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    borderRadius: 12,
    padding: 12,
    // Text inside uses matching background color to appear as blurred shapes
  },
  altCategoryGhost: {
    color: THEME.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  altNameGhost: {
    color: THEME.textMuted,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  altMetaGhost: {
    color: THEME.textMuted,
    fontSize: 11,
  },
  altLockBadge: {
    alignItems: 'center',
    marginTop: -30,
  },
  footerIcons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  customBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: THEME.popBgMedium,
    borderWidth: 1,
    borderColor: THEME.popBorderMedium,
    marginBottom: 7,
  },
  customBadgeText: { color: THEME.pop, fontSize: 12, fontWeight: '800' },

  // Extracted inline styles
  iconMarginRight6: { marginRight: 6 },
  flex1: { flex: 1, backgroundColor: THEME.dark },
  loadingContainer: { flex: 1, backgroundColor: THEME.dark },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconNudge: { marginLeft: -5, marginTop: -6 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  spacer10: { height: 10 },
});
