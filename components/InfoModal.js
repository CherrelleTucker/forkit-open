/* eslint-disable max-lines -- sectioned modal with subscription and about views */
// ForkIt — InfoModal component
// Redesigned sectioned info modal: Subscription and About.

import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useCallback, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  SCROLL_THUMB_PERCENT,
  FREE_SOLO_FORKS,
  FREE_GROUP_FORKS,
  PRO_SOLO_FORKS,
  PRO_GROUP_FORKS,
  SUPPORT_MODAL_DELAY,
  TOAST_LONG,
  EASTER_EGG_TAPS,
} from '../constants/config';
import modalStyles from '../constants/sharedStyles';
import { THEME, MODAL_CONTENT_RATIO } from '../constants/theme';
import { exportUserData, importUserData } from '../utils/exportImport';
import { openMapsSearchByText } from '../utils/helpers';

import ForkIcon from './ForkIcon';

/**
 * Info modal — Subscription and About sections.
 * @param {object} root0
 * @param {boolean} root0.visible
 * @param {() => void} root0.onClose
 * @param {boolean} root0.isPro
 * @param {boolean} root0.isProPlus
 * @param {string|null} root0.proRenew
 * @param {object} root0.usage
 * @param {() => void} root0.showPaywall
 * @param {(text: string, kind: string, ms: number) => void} root0.showToast
 * @param {() => void} root0.startTour
 * @param {() => void} root0.onDataImported
 * @param {() => Promise<void>} root0.restorePurchase
 * @returns {JSX.Element}
 */
// eslint-disable-next-line max-lines-per-function -- sectioned modal with IAP and about
function InfoModal({
  visible,
  onClose,
  isPro,
  isProPlus,
  proRenew,
  usage,
  showPaywall,
  showToast,
  startTour,
  onDataImported,
  restorePurchase,
}) {
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const [scrollRatio, setScrollRatio] = useState(0);
  const [scrollVisible, setScrollVisible] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState(null);

  function restoreMsgColor() {
    if (!restoreMsg) return THEME.textMuted;
    if (restoreMsg.type === 'success') return THEME.pop;
    if (restoreMsg.type === 'error') return THEME.error;
    return THEME.textMuted;
  }

  async function handleRestore() {
    setRestoreMsg({ type: 'info', text: 'Checking your purchases...' });
    if (restorePurchase) {
      await restorePurchase();
      if (isPro && !isProPlus) {
        setRestoreMsg({ type: 'success', text: 'Your Pro subscription is active! Go Pro+?' });
      } else if (isProPlus) {
        setRestoreMsg({ type: 'success', text: 'Your Pro+ subscription is active!' });
      } else {
        setRestoreMsg({ type: 'info', text: 'No subscription found.' });
      }
      setTimeout(() => setRestoreMsg(null), TOAST_LONG);
    } else {
      setRestoreMsg({ type: 'error', text: 'Restore not available.' });
      setTimeout(() => setRestoreMsg(null), TOAST_LONG);
    }
  }

  const easterEggTaps = useRef(0);

  function handleClose() {
    easterEggTaps.current = 0;
    onClose();
  }

  const handleExport = useCallback(async () => {
    const { success, error } = await exportUserData();
    if (!success && error) showToast(error, 'warn', TOAST_LONG);
  }, [showToast]);

  const handleImport = useCallback(async () => {
    const { success, counts, error } = await importUserData();
    if (error) {
      showToast(error, 'warn', TOAST_LONG);
      return;
    }
    if (success && counts) {
      const parts = [];
      if (counts.favorites > 0) parts.push(`${counts.favorites} favorites`);
      if (counts.blocked > 0) parts.push(`${counts.blocked} blocked`);
      if (counts.customPlaces > 0) parts.push(`${counts.customPlaces} spots`);
      const msg = parts.length > 0 ? `Imported ${parts.join(', ')}.` : 'No new data to import.';
      showToast(msg, 'success', TOAST_LONG);
      if (parts.length > 0 && onDataImported) onDataImported();
    }
  }, [showToast, onDataImported]);

  function getTierLabel() {
    if (isProPlus) return 'PRO+';
    if (isPro) return 'PRO';
    return 'FREE';
  }
  const tierLabel = getTierLabel();

  function getTierBadgeStyle() {
    if (isProPlus) return styles.proPlusBadge;
    if (isPro) return styles.proBadge;
    return styles.freeBadge;
  }
  const tierBadgeStyle = getTierBadgeStyle();

  function getSubscriptionSummary() {
    if (isProPlus) {
      return `Unlimited searches & sessions${proRenew ? `\nRenews ${proRenew}` : ''}`;
    }
    const base = `${searchesLeft} searches remaining\n${groupLeft} Fork Around remaining`;
    if (isPro) return `${base}${proRenew ? `\nRenews ${proRenew}` : ''}`;
    return `${base}\nResets ${resetDate}`;
  }

  function getSearchesLeft() {
    if (isProPlus) return '\u221E';
    const limit = isPro ? PRO_SOLO_FORKS : FREE_SOLO_FORKS;
    return Math.max(0, limit - (usage?.solo || 0));
  }
  const searchesLeft = getSearchesLeft();

  function getGroupLeft() {
    if (isProPlus) return '\u221E';
    const limit = isPro ? PRO_GROUP_FORKS : FREE_GROUP_FORKS;
    return Math.max(0, limit - (usage?.group || 0));
  }
  const groupLeft = getGroupLeft();
  const resetDate = (() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return next.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={modalStyles.infoOverlay} accessibilityViewIsModal>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
          accessibilityLabel="Close info"
          accessibilityRole="button"
        />
        <View style={styles.card} accessibilityRole="none">
          <TouchableOpacity
            style={modalStyles.infoClose}
            onPress={handleClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={THEME.textIcon} />
          </TouchableOpacity>

          <View style={[styles.contentRow, { maxHeight: SCREEN_HEIGHT * MODAL_CONTENT_RATIO }]}>
            <ScrollView
              style={modalStyles.flex1}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={(w, h) =>
                setScrollVisible(h > SCREEN_HEIGHT * MODAL_CONTENT_RATIO)
              }
              onScroll={({ nativeEvent }) => {
                const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
                const maxScroll = contentSize.height - layoutMeasurement.height;
                setScrollRatio(maxScroll > 0 ? contentOffset.y / maxScroll : 0);
              }}
              scrollEventThrottle={16}
            >
              {/* Title + Version */}
              <View style={styles.titleRow}>
                <Text style={styles.title}>
                  Fork<Text style={styles.titleIt}>It</Text>
                </Text>
                <View style={styles.titleIconNudge}>
                  <ForkIcon size={30} color={THEME.accent} rotation="0deg" />
                </View>
              </View>
              <Text
                style={styles.version}
                onPress={() => {
                  easterEggTaps.current += 1;
                  if (easterEggTaps.current >= EASTER_EGG_TAPS) {
                    easterEggTaps.current = 0;
                    handleClose();
                    openMapsSearchByText('88 Buffet Huntsville AL');
                  }
                }}
                suppressHighlighting
              >
                v{Constants.expoConfig?.version || '3.0.0'}
              </Text>

              {/* ── YOUR PLAN ── */}
              <Text style={styles.sectionLabel}>YOUR PLAN</Text>
              <View style={styles.section}>
                <View style={styles.accountRow}>
                  <View style={styles.avatarSmall}>
                    <Ionicons name="restaurant" size={18} color={THEME.pop} />
                  </View>
                  <View style={styles.accountInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.accountName}>ForkIt!</Text>
                      <View style={[styles.planBadge, tierBadgeStyle]}>
                        <Text
                          style={[
                            styles.planBadgeText,
                            (isPro || isProPlus) && styles.proBadgeText,
                          ]}
                        >
                          {tierLabel}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Subscription details */}
                <View style={styles.sectionDivider} />
                <View style={styles.subRow}>
                  <Text style={styles.planSub}>{getSubscriptionSummary()}</Text>
                  {!isProPlus && Platform.OS !== 'web' && (
                    <TouchableOpacity
                      style={styles.goProBtn}
                      onPress={() => {
                        handleClose();
                        setTimeout(
                          () => showPaywall(isPro ? 'upgrade' : 'solo'),
                          SUPPORT_MODAL_DELAY,
                        );
                      }}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={isPro ? 'Upgrade to Pro+' : 'Upgrade'}
                    >
                      <Text style={styles.goProBtnText}>{isPro ? 'Go Pro+' : 'Upgrade'}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Restore Purchase (Apple-required) */}
                {!isProPlus && Platform.OS !== 'web' && (
                  <>
                    <View style={styles.sectionDivider} />
                    <TouchableOpacity
                      onPress={handleRestore}
                      accessibilityRole="button"
                      accessibilityLabel="Restore purchase"
                    >
                      <Text style={styles.linkText}>Restore Purchase</Text>
                    </TouchableOpacity>
                    {restoreMsg && (
                      <Text style={[styles.restoreMsg, { color: restoreMsgColor() }]}>
                        {restoreMsg.text}
                      </Text>
                    )}
                  </>
                )}

                {/* Redeem Code (iOS offer codes) */}
                {Platform.OS === 'ios' && (
                  <>
                    <View style={styles.sectionDivider} />
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          const { presentCodeRedemptionSheetIOS } =
                            await import('react-native-iap');
                          await presentCodeRedemptionSheetIOS();
                        } catch (_) {
                          showToast('Could not open code redemption.', 'warn', TOAST_LONG);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Redeem a promo code"
                    >
                      <Text style={styles.linkText}>Redeem Code</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Manage Subscription */}
                {(isPro || isProPlus) && Platform.OS !== 'web' && (
                  <>
                    <View style={styles.sectionDivider} />
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(
                          Platform.OS === 'ios'
                            ? 'https://apps.apple.com/account/subscriptions'
                            : 'https://play.google.com/store/account/subscriptions',
                        ).catch(() => {})
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Manage subscription"
                    >
                      <Text style={styles.linkText}>Manage Subscription</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* ── HELP ── */}
              <Text style={styles.sectionLabel}>HELP</Text>
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    handleClose();
                    setTimeout(() => startTour(), SUPPORT_MODAL_DELAY);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Take a tour of ForkIt features"
                >
                  <Text style={styles.menuItemText}>Take a Tour</Text>
                  <Ionicons name="chevron-forward" size={16} color={THEME.textMuted} />
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() =>
                    Linking.openURL('https://forms.gle/s5KroLJrFasL1EGr7').catch(() => {})
                  }
                  activeOpacity={0.7}
                  accessibilityRole="link"
                  accessibilityLabel="Feedback"
                >
                  <Text style={styles.menuItemText}>Feedback</Text>
                  <Ionicons name="chevron-forward" size={16} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>

              {/* ── YOUR DATA ── */}
              <Text style={styles.sectionLabel}>YOUR DATA</Text>
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleExport}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Export your data"
                >
                  <Text style={styles.menuItemText}>Export Data</Text>
                  <Ionicons name="download-outline" size={16} color={THEME.textMuted} />
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleImport}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Import data from backup"
                >
                  <Text style={styles.menuItemText}>Import Data</Text>
                  <Ionicons name="push-outline" size={16} color={THEME.textMuted} />
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() =>
                    Linking.openURL('https://forkit-web.vercel.app/privacy.html').catch(() => {})
                  }
                  activeOpacity={0.7}
                  accessibilityRole="link"
                  accessibilityLabel="Privacy Policy"
                >
                  <Text style={styles.menuItemText}>Privacy Policy</Text>
                  <Ionicons name="chevron-forward" size={16} color={THEME.textMuted} />
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() =>
                    Linking.openURL('https://forkit-web.vercel.app/terms.html').catch(() => {})
                  }
                  activeOpacity={0.7}
                  accessibilityRole="link"
                  accessibilityLabel="Terms of Use"
                >
                  <Text style={styles.menuItemText}>Terms of Use</Text>
                  <Ionicons name="chevron-forward" size={16} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>
            </ScrollView>
            {scrollVisible && (
              <View style={styles.scrollTrack}>
                <View
                  style={[styles.scrollThumb, { top: `${scrollRatio * SCROLL_THUMB_PERCENT}%` }]}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.surfaceModal,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.borderGhost,
    padding: 20,
    marginHorizontal: 16,
    maxWidth: 380,
    width: '92%',
    shadowColor: THEME.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  contentRow: { flexDirection: 'row' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  title: {
    color: THEME.accent,
    fontSize: 28,
    fontFamily: 'Montserrat_700Bold',
  },
  titleIt: {
    color: THEME.pop,
  },
  titleIconNudge: {
    marginLeft: -3,
    marginTop: -4,
  },
  version: {
    color: THEME.textHint,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },

  // Section headers
  sectionLabel: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 4,
  },

  // Section cards
  section: {
    backgroundColor: THEME.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    padding: 14,
    marginBottom: 16,
  },

  // Account
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.surfaceInput,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: THEME.borderDim,
    marginVertical: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freeBadge: {
    backgroundColor: THEME.freeBadgeBg,
  },
  proBadge: {
    backgroundColor: THEME.proBadgeBg,
  },
  proPlusBadge: {
    backgroundColor: THEME.popBgMedium,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: THEME.freeBadgeText,
  },
  proBadgeText: {
    color: THEME.pop,
  },

  // Subscription
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  planSub: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: 2,
    flex: 1,
    flexShrink: 1,
  },
  goProBtn: {
    backgroundColor: THEME.surfaceLight,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  goProBtnText: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  linkText: {
    color: THEME.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textAlign: 'center',
    paddingVertical: 4,
  },

  restoreMsg: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },

  // About menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  menuItemText: {
    color: THEME.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: THEME.borderDim,
  },

  // Scroll
  scrollTrack: {
    width: 4,
    backgroundColor: THEME.borderDim,
    borderRadius: 2,
    marginLeft: 8,
    marginTop: 30,
  },
  scrollThumb: {
    position: 'absolute',
    width: 4,
    height: '30%',
    backgroundColor: THEME.popThumb,
    borderRadius: 2,
  },
});

export { InfoModal };
export default InfoModal;
