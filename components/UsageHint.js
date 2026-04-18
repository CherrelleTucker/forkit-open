// ForkIt — UsageHint component

import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import {
  FREE_SOLO_FORKS,
  FREE_GROUP_FORKS,
  FREE_FORKS_NUDGE_THRESHOLD,
  PRO_SOLO_FORKS,
  PRO_GROUP_FORKS,
} from '../constants/config';
import { THEME } from '../constants/theme';

/**
 * Displays a soft nudge or hard paywall based on usage and tier.
 * No countdown — users should feel abundant, not rationed.
 * @param {object} props
 * @param {string} props.mode - 'solo' or 'group'
 * @param {{solo: number, group: number}} props.usage
 * @param {boolean} props.isPro
 * @param {boolean} props.isProPlus
 * @param {Function} props.onPaywall
 * @returns {JSX.Element|null}
 */
// eslint-disable-next-line sonarjs/cognitive-complexity -- 3-tier branching is inherently complex
function UsageHint({ mode, usage, isPro, isProPlus, onPaywall }) {
  // Pro+ = unlimited everything, no hints
  if (isProPlus) return null;

  if (mode === 'solo') {
    const limit = isPro ? PRO_SOLO_FORKS : FREE_SOLO_FORKS;
    const nudge = isPro ? PRO_SOLO_FORKS - 5 : FREE_FORKS_NUDGE_THRESHOLD;
    const upgradeLabel = isPro
      ? 'Upgrade to Pro+ for unlimited searches'
      : 'Upgrade for more searches';

    if (usage.solo >= limit) {
      return (
        <TouchableOpacity
          onPress={() => onPaywall('solo')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={upgradeLabel}
        >
          <Text style={styles.usageHintAccent}>{upgradeLabel}</Text>
        </TouchableOpacity>
      );
    }
    if (usage.solo >= nudge) {
      return (
        <TouchableOpacity
          onPress={() => onPaywall('solo')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={upgradeLabel}
        >
          <Text style={styles.usageHint}>
            {isPro
              ? 'Running low on searches. Go Pro+?'
              : 'Enjoying ForkIt? Upgrade for more searches'}
          </Text>
        </TouchableOpacity>
      );
    }
  } else {
    const limit = isPro ? PRO_GROUP_FORKS : FREE_GROUP_FORKS;
    const upgradeLabel = isPro
      ? 'Upgrade to Pro+ for unlimited hosting'
      : 'Upgrade for more hosting (joining is always free)';

    if (usage.group >= limit) {
      return (
        <TouchableOpacity
          onPress={() => onPaywall('group')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={upgradeLabel}
        >
          <Text style={styles.usageHintAccent}>{upgradeLabel}</Text>
        </TouchableOpacity>
      );
    }
  }
  return null;
}

const styles = StyleSheet.create({
  usageHint: {
    color: THEME.textDimmed,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  usageHintAccent: {
    color: THEME.accent,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
});

export { UsageHint };
export default memo(UsageHint);
