/* eslint-disable max-lines -- multi-step modal with create/join/host/guest/result views */
// ForkIt — GroupForkModal component
// Fork Around session modal: create, join, wait, and view results.

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  DEBOUNCE_DELAY,
  MINUTES_PER_HOUR,
  RATING_LOW,
  RATING_DEFAULT,
  RATING_HIGH,
  RATING_TOP,
} from '../constants/config';
import modalStyles from '../constants/sharedStyles';
import { THEME, INITIAL_SCREEN_HEIGHT, MODAL_CONTENT_RATIO } from '../constants/theme';
import { fetchAddressSuggestions, getPlaceDetails } from '../utils/api';
import { addCustomPlace } from '../utils/customPlaces';

import ClockFacePicker from './ClockFacePicker';
import ForkIcon from './ForkIcon';
import GroupParticipantRow from './GroupParticipantRow';

// ==============================
// SCROLL DOWN INDICATOR
// ==============================

const BOUNCE_HEIGHT = 4;
const BOUNCE_DURATION = 900;

// Time picker constants
const HALF_HOUR = 30;
const FULL_HOUR = 60;
const HOURS_WRAP = 23;
const MINUTE_STEP = 5;

// Filter option arrays
const RADIUS_OPTIONS = [1, 3, 5, 10];
const PRICE_OPTIONS = [1, 2, 3, 4];
const RATING_OPTIONS_LIST = [RATING_LOW, RATING_DEFAULT, RATING_HIGH, RATING_TOP];
const GROUP_SIZE_OPTIONS = ['2-4', '5-8', '8+'];

/**
 * Animated chevron that pulses when the ScrollView has off-screen content below.
 * @param {object} props
 * @param {boolean} props.visible
 * @returns {JSX.Element|null}
 */
function ScrollDownHint({ visible }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: BOUNCE_HEIGHT,
          duration: BOUNCE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(bounce, { toValue: 0, duration: BOUNCE_DURATION, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, bounce]);

  if (!visible) return null;
  return (
    <Animated.View style={[styles.scrollHint, { transform: [{ translateY: bounce }] }]}>
      <Ionicons name="chevron-down" size={18} color={THEME.textHint} />
    </Animated.View>
  );
}

// ==============================
// GROUP FORK MODAL
// ==============================

/**
 * Modal for Fork Around sessions — create, join, wait, and view results.
 * @param {object} props - Component props
 * @param {boolean} props.visible - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {string} props.groupStep - Current step: 'menu' | 'hosting' | 'waiting' | 'result'
 * @param {string} props.groupCode - The 4-letter session code
 * @param {string} props.groupName - User's display name
 * @param {Function} props.setGroupName - Setter for groupName
 * @param {string} props.groupJoinCode - Code entered to join a session
 * @param {Function} props.setGroupJoinCode - Setter for groupJoinCode
 * @param {string} props.groupLocationName - Host's location name
 * @param {Function} props.setGroupLocationName - Setter for groupLocationName
 * @param {string} props.groupHostName - Host's display name (for joiners)
 * @param {number|null} props.groupHostRadius - Host's selected radius (for joiners)
 * @param {Array} props.customPlaces - User's Your Spots list
 * @param {Function} props.setCustomPlaces - Setter for customPlaces
 * @param {Array} props.groupParticipants - List of participants
 * @param {object|null} props.groupResult - Picked restaurant result
 * @param {boolean} props.groupLoading - Whether a group action is in progress
 * @param {string} props.groupError - Error message to display
 * @param {boolean} props.groupFiltersSubmitted - Whether filters are locked in
 * @param props.groupEditFilters
 * @param {string|null} props.groupMeetUpTime - Optional meet-up time string
 * @param {Function} props.setGroupMeetUpTime - Setter for groupMeetUpTime
 * @param {Function} props.groupCreate - Create a new session
 * @param {Function} props.groupJoin - Join an existing session
 * @param {Function} props.groupSubmitFilters - Submit/lock filters
 * @param {Function} props.groupTriggerPick - Trigger the group pick
 * @param {Function} props.groupLeave - Leave or end the session
 * @param {boolean} props.groupPollStale - Whether polling has lost connection
 * @param props.isHost
 * @param {boolean} props.canHost - Whether the user can host (has quota or Pro)
 * @param {Function} props.showPaywall - Show upgrade paywall
 * @returns {JSX.Element} The rendered Fork Around modal
 */
// eslint-disable-next-line max-lines-per-function, sonarjs/cognitive-complexity -- multi-step modal with inherent complexity
function GroupForkModal({
  visible,
  onClose,
  groupStep,
  groupCode,
  groupName,
  setGroupName,
  groupJoinCode,
  setGroupJoinCode,
  groupLocationName,
  setGroupLocationName,
  groupHostName,
  groupHostRadius,
  customPlaces,
  setCustomPlaces,
  groupParticipants,
  groupResult,
  groupLoading,
  groupError,
  groupFiltersSubmitted,
  groupEditFilters,
  groupMeetUpTime,
  setGroupMeetUpTime,
  groupCreate,
  groupJoin,
  groupSubmitFilters,
  groupTriggerPick,
  groupLeave,
  groupPollStale,
  isHost,
  canHost,
  showPaywall,
}) {
  const [gRadius, setGRadius] = useState(3);
  const [gMaxPrice, setGMaxPrice] = useState(2);
  const [gMinRating, setGMinRating] = useState(RATING_DEFAULT);
  const [gKeyword, setGKeyword] = useState('');
  const [gExcludeKeyword, setGExcludeKeyword] = useState('');
  const [gGroupSize, setGGroupSize] = useState('2-4');
  const [gHiddenGems, setGHiddenGems] = useState(false);
  const [localDialog, setLocalDialog] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });
  const showLocalAlert = (title, message, buttons) =>
    setLocalDialog({ visible: true, title, message: message || '', buttons: buttons || [] });
  const closeLocalDialog = () =>
    setLocalDialog({ visible: false, title: '', message: '', buttons: [] });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState('clock'); // 'clock' or 'manual'
  const [meetUpDate, setMeetUpDate] = useState(() => {
    // Default to next half-hour mark
    const d = new Date();
    d.setMinutes(d.getMinutes() < HALF_HOUR ? HALF_HOUR : FULL_HOUR, 0, 0);
    return d;
  });
  const [gLocQuery, setGLocQuery] = useState('');
  const [gLocSuggestions, setGLocSuggestions] = useState([]);
  const [gLocCoords, setGLocCoords] = useState(null); // { latitude, longitude, label }
  const [gOpenNow, setGOpenNow] = useState(true);
  const [gLocFromSpot, setGLocFromSpot] = useState(false);
  const gLocDebounceRef = useRef(null);
  const gLocSelectingRef = useRef(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const handleScrollLayout = useCallback((contentW, contentH, scrollH) => {
    setCanScrollDown(contentH > scrollH + 10);
  }, []);

  const handleScroll = useCallback((e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setCanScrollDown(distFromBottom > 10);
  }, []);

  // Reset location fields when modal closes
  useEffect(() => {
    if (!visible) {
      setGLocQuery('');
      setGLocCoords(null);
      setGLocSuggestions([]);
      setGLocFromSpot(false);
    }
  }, [visible]);

  /**
   * Returns a price label for the given level.
   * @param {number} level - Price level 1-4
   * @returns {string} Price label string
   */
  function priceLabel(level) {
    if (level === 1) return '$';
    if (level === 2) return '$$';
    if (level === 3) return '$$$';
    if (level === 4) return '$$$$';
    return '';
  }

  /**
   * Returns custom spots matching the given query string.
   * @param {string} query - search query
   * @returns {Array} Matching custom spots formatted as suggestions
   */
  function matchCustomSpots(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return customPlaces
      .filter(
        (cp) =>
          cp.name.toLowerCase().includes(q) ||
          (cp.vicinity && cp.vicinity.toLowerCase().includes(q)),
      )
      .map((cp) => ({
        ...cp,
        isCustomSpot: true,
        description: cp.vicinity ? `${cp.name} — ${cp.vicinity}` : cp.name,
        mainText: cp.name,
      }));
  }

  /**
   * Handle location search input with debounced autocomplete.
   * Checks saved locations first, then falls back to API search.
   * @param {string} text - search input
   * @returns {void}
   */
  function handleLocQueryChange(text) {
    if (gLocSelectingRef.current) return;
    setGLocQuery(text);
    setGLocSuggestions([]);
    setGLocCoords(null);
    setGLocFromSpot(false);
    setGroupLocationName('');
    if (gLocDebounceRef.current) clearTimeout(gLocDebounceRef.current);
    if (text.trim().length >= 1) {
      // Check Your Spots immediately (no debounce)
      const spotMatches = matchCustomSpots(text);
      if (spotMatches.length > 0) {
        setGLocSuggestions(spotMatches);
      }
    }
    if (text.trim().length >= 3) {
      gLocDebounceRef.current = setTimeout(async () => {
        const { suggestions } = await fetchAddressSuggestions(text, null);
        // Your Spots first, then API results
        const spotMatches = matchCustomSpots(text);
        setGLocSuggestions([...spotMatches, ...suggestions]);
      }, DEBOUNCE_DELAY);
    }
  }

  /**
   * Select a location from autocomplete suggestions.
   * @param {object} suggestion - autocomplete suggestion (or saved location)
   * @returns {Promise<void>}
   */
  async function selectGroupLocation(suggestion) {
    if (gLocDebounceRef.current) clearTimeout(gLocDebounceRef.current);
    gLocSelectingRef.current = true;
    setGLocSuggestions([]);
    try {
      if (suggestion.isCustomSpot) {
        setGLocQuery(suggestion.vicinity || suggestion.name);
        setGroupLocationName(suggestion.name);
        setGLocFromSpot(true);
        if (suggestion.vicinity) {
          const { suggestions: addrResults } = await fetchAddressSuggestions(
            suggestion.vicinity,
            null,
          );
          if (addrResults.length > 0) {
            const details = await getPlaceDetails(addrResults[0].placeId);
            // eslint-disable-next-line max-depth -- nested address resolution requires depth
            if (details?.geometry?.location) {
              setGLocCoords({
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
                label: suggestion.name,
              });
              return;
            }
          }
        }
        showLocalAlert(
          'No Address',
          'This spot doesn\u2019t have an address. Search for one to set the location.',
        );
        return;
      }
      setGLocQuery(suggestion.description);
      setGLocFromSpot(false);
      const details = await getPlaceDetails(suggestion.placeId);
      if (details?.geometry?.location) {
        setGLocCoords({
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
          label: suggestion.mainText || suggestion.description,
        });
        setGroupLocationName(suggestion.mainText || suggestion.description);
      }
    } finally {
      gLocSelectingRef.current = false;
    }
  }

  /** Submits the local filter state to the group session. @returns {void} */
  function handleSubmitFilters() {
    groupSubmitFilters({
      radiusMiles: gRadius,
      maxPrice: gMaxPrice,
      minRating: gMinRating,
      openNow: gOpenNow,
      hiddenGems: gHiddenGems,
      cuisineKeyword: gKeyword,
      excludeKeyword: gExcludeKeyword,
      groupSize: gGroupSize,
    });
  }

  const filterSummary = `\u2713 ${gRadius} mi \u00B7 ${priceLabel(gMaxPrice)} \u00B7 ${gMinRating.toFixed(1)}+ \u00B7 Group of ${gGroupSize}`;

  /**
   * Renders inline filter controls for group sessions.
   * @returns {JSX.Element} Filter controls
   */
  // eslint-disable-next-line max-lines-per-function -- inline filter controls with multiple slider/picker sections
  function renderGroupFilters() {
    return (
      <View style={styles.groupFiltersWrap}>
        <View style={styles.groupFilterLabelRow}>
          <Text style={styles.groupFilterLabel}>How far?</Text>
          {groupLocationName ? (
            <Text style={styles.groupLocationContext} numberOfLines={1}>
              near {groupLocationName}
            </Text>
          ) : null}
        </View>
        <View style={styles.groupPillRow}>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.groupPill, gRadius === r && styles.groupPillActive]}
              onPress={() => setGRadius(r)}
              accessibilityRole="button"
              accessibilityLabel={`${r} mile radius`}
            >
              <Text style={[styles.groupPillText, gRadius === r && styles.groupPillTextActive]}>
                {r} mi
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.groupFilterLabel}>Max price?</Text>
        <View style={styles.groupPillRow}>
          {PRICE_OPTIONS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.groupPill, gMaxPrice === p && styles.groupPillActive]}
              onPress={() => setGMaxPrice(p)}
              accessibilityRole="button"
              accessibilityLabel={`Max price ${priceLabel(p)}`}
            >
              <Text style={[styles.groupPillText, gMaxPrice === p && styles.groupPillTextActive]}>
                {priceLabel(p)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.groupFilterLabel}>Min rating?</Text>
        <View style={styles.groupPillRow}>
          {RATING_OPTIONS_LIST.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.groupPill, gMinRating === r && styles.groupPillActive]}
              onPress={() => setGMinRating(r)}
              accessibilityRole="button"
              accessibilityLabel={`Minimum rating ${r} stars`}
            >
              <Text style={[styles.groupPillText, gMinRating === r && styles.groupPillTextActive]}>
                {r.toFixed(1)}+
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isHost && (
          <>
            <Text style={styles.groupFilterLabel}>Group size</Text>
            <View style={styles.groupPillRow}>
              {GROUP_SIZE_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.groupPill, gGroupSize === s && styles.groupPillActive]}
                  onPress={() => setGGroupSize(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`Group size ${s}`}
                >
                  <Text
                    style={[styles.groupPillText, gGroupSize === s && styles.groupPillTextActive]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.groupFilterLabel}>Skip the chains?</Text>
        <View style={styles.groupPillRow}>
          <TouchableOpacity
            style={[styles.groupPill, !gHiddenGems && styles.groupPillActive]}
            onPress={() => setGHiddenGems(false)}
            accessibilityRole="button"
            accessibilityLabel="Include all restaurants"
          >
            <Text style={[styles.groupPillText, !gHiddenGems && styles.groupPillTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.groupPill, gHiddenGems && styles.groupPillActive]}
            onPress={() => setGHiddenGems(true)}
            accessibilityRole="button"
            accessibilityLabel="Local spots only"
          >
            <Text style={[styles.groupPillText, gHiddenGems && styles.groupPillTextActive]}>
              Local Only
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.groupFilterLabel}>Open now?</Text>
        <View style={styles.groupPillRow}>
          <TouchableOpacity
            style={[styles.groupPill, gOpenNow && styles.groupPillActive]}
            onPress={() => setGOpenNow(true)}
            accessibilityRole="button"
            accessibilityLabel="Only show open restaurants"
          >
            <Text style={[styles.groupPillText, gOpenNow && styles.groupPillTextActive]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.groupPill, !gOpenNow && styles.groupPillActive]}
            onPress={() => setGOpenNow(false)}
            accessibilityRole="button"
            accessibilityLabel="Show all restaurants regardless of hours"
          >
            <Text style={[styles.groupPillText, !gOpenNow && styles.groupPillTextActive]}>No</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.groupFilterLabel}>Cuisine</Text>
        <TextInput
          style={styles.groupInput}
          placeholder="e.g. sushi, tacos, brunch..."
          placeholderTextColor={THEME.textHint}
          value={gKeyword}
          onChangeText={setGKeyword}
          maxLength={40}
          accessibilityLabel="Cuisine keyword filter"
        />

        <Text style={styles.groupFilterLabel}>Not in the mood for</Text>
        <TextInput
          style={styles.groupInput}
          placeholder="e.g. pizza, indian..."
          placeholderTextColor={THEME.textHint}
          value={gExcludeKeyword}
          onChangeText={setGExcludeKeyword}
          maxLength={100}
          accessibilityLabel="Exclude cuisine filter"
        />
      </View>
    );
  }

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={modalStyles.infoOverlay} accessibilityViewIsModal>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
            accessibilityLabel="Close fork around"
            accessibilityRole="button"
          />
          <View style={styles.infoCard} accessibilityRole="none">
            <TouchableOpacity
              style={modalStyles.infoClose}
              onPress={onClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={THEME.textIcon} />
            </TouchableOpacity>

            {groupStep === 'menu' && (
              <>
                <ScrollView
                  style={styles.groupScrollView}
                  showsVerticalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={100}
                  onContentSizeChange={(w, h) =>
                    handleScrollLayout(w, h, INITIAL_SCREEN_HEIGHT * MODAL_CONTENT_RATIO)
                  }
                >
                  <View style={styles.groupHeaderRow}>
                    <Text
                      style={[
                        modalStyles.infoHeading,
                        styles.supportHeadingCenter,
                        styles.groupHeaderOrange,
                      ]}
                      accessibilityRole="header"
                    >
                      Fork Around.
                    </Text>
                    <Text
                      style={[
                        modalStyles.infoHeading,
                        styles.supportHeadingCenter,
                        styles.groupHeaderTeal,
                      ]}
                    >
                      Find Out.
                    </Text>
                  </View>
                  <Text style={[modalStyles.infoText, styles.supportSubCenter]}>
                    Pick a restaurant with friends.
                  </Text>

                  {/* — HOST SECTION — */}
                  <View style={styles.groupSection}>
                    <Text style={styles.groupSectionLabel}>Where</Text>
                    <TextInput
                      style={styles.groupInput}
                      placeholder="Search address or spot name"
                      placeholderTextColor={THEME.textHint}
                      value={gLocQuery}
                      onChangeText={handleLocQueryChange}
                      maxLength={100}
                      autoCapitalize="words"
                      accessibilityLabel="Search for a location to center the group session"
                    />
                    {gLocSuggestions.length > 0 && (
                      <View style={styles.groupLocSuggestions}>
                        {gLocSuggestions.map((s) => (
                          <TouchableOpacity
                            key={s.isCustomSpot ? `spot-${s.place_id}` : s.placeId}
                            style={styles.groupLocSuggestionRow}
                            onPress={() => selectGroupLocation(s)}
                            accessibilityRole="button"
                            accessibilityLabel={s.description}
                          >
                            {s.isCustomSpot && (
                              <Ionicons name="bookmark" size={14} color={THEME.pop} />
                            )}
                            <Text style={styles.groupLocSuggestionText} numberOfLines={1}>
                              {s.description}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {gLocCoords && (
                      <TextInput
                        style={[styles.groupInputSmall, gLocFromSpot && styles.groupInputLocked]}
                        placeholder="Nickname (e.g. The Office)"
                        placeholderTextColor={THEME.textHint}
                        value={groupLocationName}
                        onChangeText={setGroupLocationName}
                        maxLength={60}
                        autoCapitalize="words"
                        editable={!gLocFromSpot}
                        accessibilityLabel="Friendly name for your location"
                      />
                    )}
                  </View>

                  {/* Optional time — compact row */}
                  <TouchableOpacity
                    style={[styles.groupTimeBtn, groupMeetUpTime && styles.groupTimeBtnActive]}
                    onPress={() => {
                      if (groupMeetUpTime) {
                        setGroupMeetUpTime(null);
                      } else {
                        setShowTimePicker(true);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      groupMeetUpTime
                        ? `Meet-up time: ${groupMeetUpTime}. Tap to clear.`
                        : 'Set a meet-up time'
                    }
                  >
                    <Ionicons
                      name={groupMeetUpTime ? 'close-circle' : 'time-outline'}
                      size={15}
                      color={groupMeetUpTime ? THEME.pop : THEME.textHint}
                    />
                    <Text
                      style={[
                        styles.groupTimeBtnText,
                        groupMeetUpTime && styles.groupTimeBtnTextActive,
                      ]}
                    >
                      {groupMeetUpTime
                        ? `Meet at ${groupMeetUpTime}`
                        : 'Set meet-up time (optional)'}
                    </Text>
                  </TouchableOpacity>

                  {gLocCoords &&
                    !gLocFromSpot &&
                    (() => {
                      const matchedSpot = customPlaces.find(
                        (cp) =>
                          cp.vicinity &&
                          cp.vicinity.toLowerCase() ===
                            (gLocQuery || gLocCoords.label).toLowerCase(),
                      );
                      return (
                        <View style={styles.groupSaveRow}>
                          {matchedSpot ? (
                            <View style={styles.groupSaveSpotBtn}>
                              <Ionicons name="bookmark" size={14} color={THEME.pop} />
                              <Text style={styles.groupSaveSpotText}>
                                Saved in Spots as &ldquo;{matchedSpot.name}&rdquo;
                              </Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.groupSaveSpotBtn}
                              onPress={() => {
                                const spotName = groupLocationName.trim() || gLocCoords.label;
                                const address = gLocQuery || gLocCoords.label;
                                showLocalAlert(
                                  'Save to Your Spots?',
                                  `"${spotName}" at ${address}\n\nYou can add notes later from Your Spots.`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Save',
                                      onPress: () => {
                                        addCustomPlace(spotName, address, {
                                          notes: '',
                                          lat: gLocCoords.latitude,
                                          lng: gLocCoords.longitude,
                                          currentCustom: customPlaces,
                                          setCustom: setCustomPlaces,
                                        });
                                      },
                                    },
                                  ],
                                );
                              }}
                              accessibilityRole="button"
                              accessibilityLabel="Save this location to Your Spots"
                            >
                              <Ionicons name="bookmark-outline" size={14} color={THEME.pop} />
                              <Text style={styles.groupSaveSpotText}>Save to Spots</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })()}

                  <TouchableOpacity
                    style={[
                      styles.supportBtn,
                      styles.groupHostBtn,
                      styles.groupHostBtnGap,
                      canHost && !gLocCoords && styles.groupBtnDisabled,
                    ]}
                    onPress={() => {
                      if (!canHost) {
                        showPaywall('group');
                        return;
                      }
                      if (!gLocCoords) return;
                      const locationLabel =
                        groupLocationName || gLocCoords.label || 'selected location';
                      const timeNote = groupMeetUpTime ? `\nMeet-up time: ${groupMeetUpTime}` : '';
                      showLocalAlert(
                        'Start Group Session?',
                        `Location: ${locationLabel}${timeNote}`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Start', onPress: () => groupCreate(gLocCoords) },
                        ],
                      );
                    }}
                    disabled={groupLoading}
                    accessibilityRole="button"
                    accessibilityLabel={
                      canHost ? 'Host a new group session' : 'Upgrade to Pro to host more sessions'
                    }
                  >
                    <Ionicons
                      name={canHost ? 'add-circle' : 'lock-closed'}
                      size={18}
                      color={THEME.white}
                    />
                    <Text style={styles.supportBtnText}>
                      {canHost ? 'Host a Session' : 'Upgrade to Pro to Host'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.groupDivider}>
                    <View style={styles.groupDividerLine} />
                    <Text style={styles.groupDividerText}>or join a session</Text>
                    <View style={styles.groupDividerLine} />
                  </View>

                  <TextInput
                    style={styles.groupInput}
                    placeholder="Your name"
                    placeholderTextColor={THEME.textHint}
                    value={groupName}
                    onChangeText={setGroupName}
                    maxLength={20}
                    autoCapitalize="words"
                    accessibilityLabel="Your display name"
                  />

                  <TextInput
                    style={[styles.groupInput, styles.marginTop8]}
                    placeholder="Enter 4-letter code"
                    placeholderTextColor={THEME.textHint}
                    value={groupJoinCode}
                    onChangeText={(t) => setGroupJoinCode(t.toUpperCase())}
                    maxLength={4}
                    autoCapitalize="characters"
                    accessibilityLabel="Session code to join"
                  />

                  <TouchableOpacity
                    style={[styles.supportBtn, styles.groupJoinBtn]}
                    onPress={groupJoin}
                    disabled={groupLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Join an existing group session"
                  >
                    <Ionicons name="enter" size={18} color={THEME.white} />
                    <Text style={styles.supportBtnText}>
                      {groupLoading ? 'Joining\u2026' : 'Join a Session'}
                    </Text>
                  </TouchableOpacity>

                  {!!groupError && <Text style={styles.groupError}>{groupError}</Text>}
                </ScrollView>
                <ScrollDownHint visible={canScrollDown} />
              </>
            )}

            {groupStep === 'hosting' && (
              <>
                <ScrollView
                  style={styles.groupScrollView}
                  showsVerticalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={100}
                  onContentSizeChange={(w, h) =>
                    handleScrollLayout(w, h, INITIAL_SCREEN_HEIGHT * MODAL_CONTENT_RATIO)
                  }
                >
                  {!groupFiltersSubmitted ? (
                    <>
                      <Text
                        style={[modalStyles.infoHeading, styles.supportHeadingCenter]}
                        accessibilityRole="header"
                      >
                        Set your filters first
                      </Text>
                      <Text style={[modalStyles.infoText, styles.supportSubCenter]}>
                        Save your filters to get the session code to share.
                      </Text>
                      <TextInput
                        style={[styles.groupInput, styles.marginTop8]}
                        placeholder="Your name"
                        placeholderTextColor={THEME.textHint}
                        value={groupName}
                        onChangeText={setGroupName}
                        maxLength={20}
                        autoCapitalize="words"
                        accessibilityLabel="Your display name"
                      />
                      {renderGroupFilters()}
                      <TouchableOpacity
                        style={[styles.supportBtn, styles.groupSaveBtn]}
                        onPress={handleSubmitFilters}
                        disabled={groupLoading}
                        accessibilityRole="button"
                        accessibilityLabel="Save filters"
                      >
                        <Ionicons name="checkmark-circle" size={18} color={THEME.white} />
                        <Text style={styles.supportBtnText}>
                          {groupLoading ? 'Saving\u2026' : 'Save Filters'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text
                        style={styles.groupCodeDisplay}
                        selectable
                        accessibilityLabel={`Session code: ${groupCode.split('').join(' ')}`}
                      >
                        {groupCode}
                      </Text>
                      <TouchableOpacity
                        style={[styles.supportBtn, styles.groupShareBtn]}
                        onPress={() => {
                          const url = `https://forkit-web.vercel.app/group?code=${groupCode}&ref=app`;
                          const timeNote = groupMeetUpTime ? ` Meet at ${groupMeetUpTime}.` : '';
                          Share.share({
                            message: `Fork around and find out! Enter code ${groupCode} in the app, or join from your browser: ${url}${timeNote}`,
                          }).catch(() => {});
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Share session code with friends"
                      >
                        <Ionicons name="share-social" size={18} color={THEME.white} />
                        <Text style={styles.supportBtnText}>Share Code</Text>
                      </TouchableOpacity>

                      {groupMeetUpTime && (
                        <View style={styles.groupMeetUpRow}>
                          <Ionicons name="time" size={16} color={THEME.pop} />
                          <Text style={styles.groupMeetUpText}>Meet at {groupMeetUpTime}</Text>
                        </View>
                      )}

                      <View style={styles.groupParticipantList}>
                        {groupParticipants.map((p, i) => (
                          // eslint-disable-next-line react/no-array-index-key -- participants may share names
                          <GroupParticipantRow key={`${p.name}-${i}`} participant={p} />
                        ))}
                      </View>
                      <Text style={styles.groupReadyText}>{filterSummary}</Text>
                      <TouchableOpacity
                        onPress={groupEditFilters}
                        style={styles.groupEditFiltersBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Edit your filters"
                      >
                        <Ionicons name="pencil" size={14} color={THEME.textIcon} />
                        <Text style={styles.groupEditFiltersText}>Edit My Filters</Text>
                      </TouchableOpacity>

                      {(() => {
                        const readyCount = groupParticipants.filter((p) => p.ready).length;
                        const totalCount = groupParticipants.length;
                        const notReady = totalCount - readyCount;
                        if (readyCount < 2) return null;
                        return (
                          <>
                            {notReady > 0 && (
                              <Text style={styles.groupReadyHint}>
                                {readyCount} of {totalCount} ready. Go whenever you want
                              </Text>
                            )}
                            <TouchableOpacity
                              style={[styles.supportBtn, styles.groupPickBtn]}
                              onPress={groupTriggerPick}
                              disabled={groupLoading}
                              accessibilityRole="button"
                              accessibilityLabel="Fork it for everyone"
                            >
                              <Text style={styles.supportBtnText}>
                                {groupLoading ? 'Picking\u2026' : 'Fork It for Everyone'}
                              </Text>
                              {!groupLoading && <ForkIcon size={16} color={THEME.white} />}
                            </TouchableOpacity>
                          </>
                        );
                      })()}
                    </>
                  )}

                  {groupPollStale && (
                    <Text style={styles.groupStaleHint}>Connection lost, retrying…</Text>
                  )}
                  {!!groupError && <Text style={styles.groupError}>{groupError}</Text>}

                  <TouchableOpacity
                    onPress={groupLeave}
                    style={styles.groupLeaveBtn}
                    accessibilityRole="button"
                  >
                    <Text style={styles.groupLeaveText}>End Session</Text>
                  </TouchableOpacity>
                </ScrollView>
                <ScrollDownHint visible={canScrollDown} />
              </>
            )}

            {groupStep === 'waiting' && (
              <>
                <ScrollView
                  style={styles.groupScrollView}
                  showsVerticalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={100}
                  onContentSizeChange={(w, h) =>
                    handleScrollLayout(w, h, INITIAL_SCREEN_HEIGHT * MODAL_CONTENT_RATIO)
                  }
                >
                  <Text
                    style={[modalStyles.infoHeading, styles.supportHeadingCenter]}
                    accessibilityRole="header"
                  >
                    Joined: {groupCode}
                  </Text>
                  {groupLocationName || groupHostName ? (
                    <Text style={styles.groupLocationContext}>
                      {groupHostName || 'The host'} is searching near
                      {groupLocationName ? ` ${groupLocationName}` : ' their location'}
                      {groupHostRadius ? ` (within ${groupHostRadius} mi)` : ''}.
                    </Text>
                  ) : null}
                  {groupMeetUpTime && (
                    <View style={styles.groupMeetUpRow}>
                      <Ionicons name="time" size={16} color={THEME.pop} />
                      <Text style={styles.groupMeetUpText}>Meet at {groupMeetUpTime}</Text>
                    </View>
                  )}
                  <Text style={[modalStyles.infoText, styles.supportSubCenter]}>
                    Set your filters below, then lock them in.
                  </Text>

                  <View style={styles.groupParticipantList}>
                    {groupParticipants.map((p, i) => (
                      // eslint-disable-next-line react/no-array-index-key -- participants may share names
                      <GroupParticipantRow key={`${p.name}-${i}`} participant={p} />
                    ))}
                  </View>

                  {!groupFiltersSubmitted ? (
                    <>
                      {renderGroupFilters()}
                      <TouchableOpacity
                        style={[styles.supportBtn, styles.groupSaveBtn]}
                        onPress={handleSubmitFilters}
                        disabled={groupLoading}
                        accessibilityRole="button"
                        accessibilityLabel="Save filters"
                      >
                        <Ionicons name="checkmark-circle" size={18} color={THEME.white} />
                        <Text style={styles.supportBtnText}>
                          {groupLoading ? 'Saving\u2026' : 'Save Filters'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.groupReadyText}>
                        {filterSummary}
                        {'\n'}Waiting for the host to pick…
                      </Text>
                      <TouchableOpacity
                        onPress={groupEditFilters}
                        style={styles.groupEditFiltersBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Edit your filters"
                      >
                        <Ionicons name="pencil" size={14} color={THEME.textIcon} />
                        <Text style={styles.groupEditFiltersText}>Edit My Filters</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {groupPollStale && (
                    <Text style={styles.groupStaleHint}>Connection lost, retrying…</Text>
                  )}
                  {!!groupError && <Text style={styles.groupError}>{groupError}</Text>}

                  <TouchableOpacity
                    onPress={groupLeave}
                    style={styles.groupLeaveBtn}
                    accessibilityRole="button"
                  >
                    <Text style={styles.groupLeaveText}>Leave Session</Text>
                  </TouchableOpacity>
                </ScrollView>
                <ScrollDownHint visible={canScrollDown} />
              </>
            )}

            {groupStep === 'result' && groupResult && (
              <ScrollView style={styles.groupScrollView} showsVerticalScrollIndicator={false}>
                <Text style={[styles.groupHintText, styles.groupResultHint]}>
                  {isHost ? 'Hosted' : 'Joined'} session {groupCode}
                </Text>
                <Text style={styles.groupResultName} accessibilityRole="header">
                  {groupResult.name}
                </Text>
                {(groupResult.rating || groupResult.price_level) && (
                  <Text style={styles.groupResultDetail}>
                    {groupResult.rating
                      ? `${'⭐'.repeat(Math.round(groupResult.rating))} ${groupResult.rating}`
                      : ''}
                    {groupResult.rating && groupResult.price_level ? '  ·  ' : ''}
                    {groupResult.price_level ? '$'.repeat(groupResult.price_level) : ''}
                  </Text>
                )}
                {groupResult.vicinity && (
                  <Text style={styles.groupResultDetail}>{groupResult.vicinity}</Text>
                )}
                {groupResult.opening_hours && (
                  <Text
                    style={[
                      styles.groupResultDetail,
                      { color: groupResult.opening_hours.open_now ? THEME.pop : THEME.accent },
                    ]}
                  >
                    {groupResult.opening_hours.open_now ? 'Open now' : 'May be closed'}
                  </Text>
                )}
                {groupMeetUpTime && (
                  <View style={[styles.groupMeetUpRow, styles.marginTop8]}>
                    <Ionicons name="time" size={16} color={THEME.pop} />
                    <Text style={styles.groupMeetUpText}>Meet at {groupMeetUpTime}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.supportBtn, styles.groupDirectionsBtn]}
                  onPress={() => {
                    const { lat, lng } = groupResult.geometry?.location || {};
                    if (lat && lng) {
                      Linking.openURL(
                        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                      );
                    }
                  }}
                  accessibilityRole="link"
                >
                  <Ionicons name="navigate" size={18} color={THEME.white} />
                  <Text style={styles.supportBtnText}>Get Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.supportBtn, styles.groupInfoBtn]}
                  onPress={() => {
                    const query = encodeURIComponent(
                      `${groupResult.name} ${groupResult.vicinity || ''}`,
                    );
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
                  }}
                  accessibilityRole="link"
                >
                  <Ionicons name="information-circle" size={18} color={THEME.pop} />
                  <Text style={[styles.supportBtnText, styles.groupInfoBtnText]}>
                    Menu, Phone & More
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.groupLeaveBtn, styles.marginTop16]}
                  accessibilityRole="button"
                >
                  <Text style={styles.groupLeaveText}>Done</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
        {/* ── Inline sub-dialogs (rendered inside parent modal to avoid iOS modal stacking) ── */}
        {localDialog.visible && (
          <View style={styles.inlineOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeLocalDialog}
              accessibilityLabel="Dismiss dialog"
              accessibilityRole="button"
            />
            <View style={styles.inlineDialogCard}>
              <Text style={styles.inlineDialogTitle} accessibilityRole="header">
                {localDialog.title}
              </Text>
              {!!localDialog.message && (
                <Text style={styles.inlineDialogMessage}>{localDialog.message}</Text>
              )}
              <View style={styles.inlineDialogButtons}>
                {(localDialog.buttons || [])
                  .filter((b) => b.style !== 'cancel')
                  .map((btn) => (
                    <TouchableOpacity
                      key={btn.text}
                      style={[
                        styles.inlineDialogBtn,
                        btn.style === 'destructive' && styles.inlineDialogBtnDestructive,
                      ]}
                      onPress={() => {
                        closeLocalDialog();
                        if (btn.onPress) btn.onPress();
                      }}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.inlineDialogBtnText,
                          btn.style === 'destructive' && styles.inlineDialogBtnTextDestructive,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                {(localDialog.buttons || [])
                  .filter((b) => b.style === 'cancel')
                  .map((btn) => (
                    <TouchableOpacity
                      key={btn.text}
                      style={styles.inlineDialogCancelBtn}
                      onPress={() => {
                        closeLocalDialog();
                        if (btn.onPress) btn.onPress();
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={styles.inlineDialogCancelText}>{btn.text}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          </View>
        )}
        {showTimePicker && (
          <View style={styles.inlineOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowTimePicker(false)}
              accessibilityLabel="Close time picker"
              accessibilityRole="button"
            />
            <View style={styles.infoCard}>
              <Text
                style={[
                  modalStyles.infoHeading,
                  modalStyles.marginTopNone,
                  styles.timePickerHeading,
                ]}
                accessibilityRole="header"
              >
                Set Meet-Up Time
              </Text>

              {timePickerMode === 'clock' ? (
                <ClockFacePicker
                  hours={meetUpDate.getHours()}
                  minutes={meetUpDate.getMinutes()}
                  onChange={(h, m) => {
                    const d = new Date(meetUpDate);
                    d.setHours(h, m);
                    setMeetUpDate(d);
                  }}
                />
              ) : (
                <View style={styles.timePickerRow}>
                  <View style={styles.timePickerCol}>
                    <TouchableOpacity
                      onPress={() => {
                        const d = new Date(meetUpDate);
                        d.setHours((d.getHours() + 1) % 24);
                        setMeetUpDate(d);
                      }}
                      style={styles.timePickerArrow}
                      accessibilityLabel="Increase hour"
                      accessibilityRole="button"
                    >
                      <Ionicons name="chevron-up" size={24} color={THEME.accent} />
                    </TouchableOpacity>
                    <Text style={styles.timePickerDigit}>
                      {String(meetUpDate.getHours() % 12 || 12).padStart(2, '0')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        const d = new Date(meetUpDate);
                        d.setHours((d.getHours() + HOURS_WRAP) % 24);
                        setMeetUpDate(d);
                      }}
                      style={styles.timePickerArrow}
                      accessibilityLabel="Decrease hour"
                      accessibilityRole="button"
                    >
                      <Ionicons name="chevron-down" size={24} color={THEME.accent} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.timePickerColon}>:</Text>
                  <View style={styles.timePickerCol}>
                    <TouchableOpacity
                      onPress={() => {
                        const d = new Date(meetUpDate);
                        d.setMinutes((d.getMinutes() + MINUTE_STEP) % MINUTES_PER_HOUR);
                        setMeetUpDate(d);
                      }}
                      style={styles.timePickerArrow}
                      accessibilityLabel="Increase minutes"
                      accessibilityRole="button"
                    >
                      <Ionicons name="chevron-up" size={24} color={THEME.accent} />
                    </TouchableOpacity>
                    <Text style={styles.timePickerDigit}>
                      {String(meetUpDate.getMinutes()).padStart(2, '0')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        const d = new Date(meetUpDate);
                        d.setMinutes(
                          (d.getMinutes() - MINUTE_STEP + MINUTES_PER_HOUR) % MINUTES_PER_HOUR,
                        );
                        setMeetUpDate(d);
                      }}
                      style={styles.timePickerArrow}
                      accessibilityLabel="Decrease minutes"
                      accessibilityRole="button"
                    >
                      <Ionicons name="chevron-down" size={24} color={THEME.accent} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const d = new Date(meetUpDate);
                      d.setHours((d.getHours() + 12) % 24);
                      setMeetUpDate(d);
                    }}
                    style={styles.timePickerAmPm}
                    accessibilityLabel="Toggle AM PM"
                    accessibilityRole="button"
                  >
                    <Text style={styles.timePickerAmPmText}>
                      {meetUpDate.getHours() < 12 ? 'AM' : 'PM'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                onPress={() => {
                  const formatted = meetUpDate.toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  setGroupMeetUpTime(formatted);
                  setShowTimePicker(false);
                }}
                style={styles.timePickerConfirm}
                accessibilityLabel="Confirm time"
                accessibilityRole="button"
              >
                <Text style={styles.timePickerConfirmText}>Set Time</Text>
              </TouchableOpacity>

              <View style={styles.timePickerFooter}>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  style={styles.timePickerCancelBtn}
                  accessibilityLabel="Cancel"
                  accessibilityRole="button"
                >
                  <Text style={styles.timePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timePickerToggle}
                  onPress={() => setTimePickerMode(timePickerMode === 'clock' ? 'manual' : 'clock')}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${timePickerMode === 'clock' ? 'manual' : 'clock'} picker`}
                >
                  <Ionicons
                    name={timePickerMode === 'clock' ? 'keypad-outline' : 'time-outline'}
                    size={16}
                    color={THEME.textSubtle}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  inlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  inlineDialogCard: {
    backgroundColor: THEME.surfaceModal,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.borderGhost,
    padding: 24,
    maxWidth: 340,
    width: '88%',
    alignItems: 'center',
  },
  inlineDialogTitle: {
    color: THEME.accent,
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  inlineDialogMessage: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  inlineDialogButtons: {
    width: '100%',
    gap: 8,
  },
  inlineDialogBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: THEME.surfaceLight,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    alignItems: 'center',
  },
  inlineDialogBtnText: {
    color: THEME.textPrimary,
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
  },
  inlineDialogBtnDestructive: {
    borderColor: THEME.destructiveBorder,
    backgroundColor: THEME.destructiveBg,
  },
  inlineDialogBtnTextDestructive: {
    color: THEME.destructive,
  },
  inlineDialogCancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  inlineDialogCancelText: {
    color: THEME.textMuted,
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  infoCard: {
    backgroundColor: THEME.surfaceModal,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.borderGhost,
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginHorizontal: 20,
    maxWidth: 400,
    width: '92%',
    shadowColor: THEME.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  supportHeadingCenter: { marginTop: 0, textAlign: 'center' },
  supportSubCenter: {
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat_500Medium',
    color: THEME.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  supportBtnText: {
    color: THEME.white,
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  marginTop8: { marginTop: 8 },
  marginTop16: { marginTop: 16 },

  // Fork Around styles
  groupSection: {
    marginBottom: 8,
  },
  groupSectionLabel: {
    color: THEME.textMuted,
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  groupInput: {
    backgroundColor: THEME.surfaceLight,
    color: THEME.textBright,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.borderFaint,
    textAlign: 'center',
  },
  groupInputSmall: {
    backgroundColor: THEME.surfaceLight,
    color: THEME.textBright,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 8,
    borderWidth: 1,
    borderColor: THEME.borderDim,
    textAlign: 'center',
  },
  groupDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  groupDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.borderDim,
  },
  groupDividerText: {
    color: THEME.textHint,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    marginHorizontal: 16,
    textTransform: 'lowercase',
  },
  groupCodeDisplay: {
    color: THEME.accent,
    fontSize: 52,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
    letterSpacing: 12,
    marginVertical: 16,
  },
  groupParticipantList: {
    marginVertical: 12,
  },
  groupReadyText: {
    color: THEME.pop,
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  groupReadyHint: {
    color: THEME.textDimmed,
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 5,
  },
  groupError: {
    color: THEME.accent,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
  },
  groupStaleHint: {
    color: THEME.textDimmed,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 7,
    fontStyle: 'italic',
  },
  groupHintText: {
    color: THEME.textHint,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 6,
    opacity: 0.7,
  },
  groupLocationContext: {
    color: THEME.pop,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  groupMeetUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  groupMeetUpText: {
    color: THEME.pop,
    fontSize: 14,
    fontWeight: '600',
  },
  groupTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.borderFaint,
    alignSelf: 'center',
    marginBottom: 14,
  },
  groupTimeBtnActive: {
    borderColor: THEME.pop,
    backgroundColor: THEME.popBg,
  },
  groupTimeBtnText: {
    color: THEME.textHint,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  groupTimeBtnTextActive: {
    color: THEME.pop,
    fontWeight: '600',
  },
  timePickerHeading: {
    textAlign: 'center',
    marginBottom: 12,
  },
  timePickerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  timePickerToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: THEME.surfaceHover,
  },
  timePickerCancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  timePickerCancelText: {
    color: THEME.textMuted,
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 8,
    width: '100%',
  },
  timePickerCol: {
    alignItems: 'center',
    gap: 2,
  },
  timePickerArrow: {
    padding: 8,
  },
  timePickerDigit: {
    color: THEME.textPrimary,
    fontSize: 36,
    fontFamily: 'Montserrat_700Bold',
    minWidth: 56,
    textAlign: 'center',
    backgroundColor: THEME.surfaceLight,
    borderRadius: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  timePickerColon: {
    color: THEME.textMuted,
    fontSize: 32,
    fontFamily: 'Montserrat_700Bold',
  },
  timePickerAmPm: {
    backgroundColor: THEME.popBgMedium,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: THEME.popBorder,
  },
  timePickerAmPmText: {
    color: THEME.pop,
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  timePickerConfirm: {
    backgroundColor: THEME.accent,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 32,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  timePickerConfirmText: {
    color: THEME.white,
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  groupLocSuggestions: {
    backgroundColor: THEME.surfaceDropdown,
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  groupLocSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderSubtle,
  },
  groupLocSuggestionText: {
    color: THEME.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  groupSaveRow: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupInputLocked: {
    opacity: 0.6,
  },
  groupSaveSpotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupSaveSpotText: {
    color: THEME.pop,
    fontSize: 14,
    fontWeight: '600',
  },
  groupLeaveBtn: {
    marginTop: 12,
    alignSelf: 'center',
  },
  groupLeaveText: {
    color: THEME.textHint,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  groupResultName: {
    color: THEME.cream,
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
    marginVertical: 12,
  },
  groupResultDetail: {
    color: THEME.textSubtle,
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
    textAlign: 'center',
    marginBottom: 6,
  },
  groupPickBtn: {
    backgroundColor: THEME.accent,
    marginTop: 8,
  },
  groupDirectionsBtn: {
    backgroundColor: THEME.pop,
    marginTop: 16,
  },
  groupFilterLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  groupFiltersWrap: {
    marginVertical: 8,
  },
  groupFilterLabel: {
    color: THEME.textMuted,
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 14,
  },
  groupPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 5,
  },
  groupPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    backgroundColor: THEME.surfaceLight,
  },
  groupPillActive: {
    backgroundColor: THEME.pop,
    borderColor: THEME.pop,
  },
  groupPillText: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  groupPillTextActive: {
    color: THEME.white,
  },
  groupScrollView: {
    maxHeight: INITIAL_SCREEN_HEIGHT * MODAL_CONTENT_RATIO,
  },
  groupHostBtn: { backgroundColor: THEME.accent },
  groupShareBtn: { backgroundColor: THEME.accent },
  groupJoinBtn: { backgroundColor: THEME.pop },
  groupSaveBtn: { backgroundColor: THEME.pop },
  groupInfoBtn: {
    backgroundColor: THEME.surfaceLight,
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },
  groupInfoBtnText: { color: THEME.pop },
  groupResultHint: { marginTop: 0, marginBottom: 8 },
  groupHostBtnGap: { marginTop: 6 },
  groupBtnDisabled: { opacity: 0.5 },
  groupEditFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    paddingVertical: 8,
  },
  groupEditFiltersText: {
    color: THEME.textIcon,
    fontSize: 14,
    fontWeight: '600',
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  groupHeaderOrange: {
    color: THEME.accent,
    marginBottom: 0,
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
  },
  groupHeaderTeal: {
    color: THEME.pop,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 8,
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
  },
  scrollHint: {
    alignSelf: 'center',
    paddingTop: 2,
    opacity: 0.6,
  },
});

export { GroupForkModal };
export default GroupForkModal;
