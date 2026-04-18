// ForkIt — Toast component

import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { THEME } from '../constants/theme';

/**
 * Toast notification overlay.
 * @param {object} props
 * @param {string} props.text - Toast message text
 * @param {string} props.kind - Toast type ('warn' | 'info' | 'success')
 * @returns {React.JSX.Element}
 */
function Toast({ text, kind }) {
  if (!text) return null;
  // Skip success toasts entirely
  if (kind === 'success') return null;
  const icon = kind === 'warn' ? 'alert-circle' : 'information-circle';
  const iconColor = THEME.accent;
  const borderColor = kind === 'warn' ? THEME.accentToastBorder : THEME.accentToastBorderLight;
  return (
    <View style={styles.toastWrap} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <View style={[styles.toast, { borderColor }]}>
        <Ionicons name={icon} size={16} color={iconColor} importantForAccessibility="no" />
        <Text style={styles.toastText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toastWrap: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    zIndex: 1100,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: THEME.toastBg,
    borderWidth: 1,
    borderColor: THEME.borderFaint,
  },
  toastText: { color: THEME.textPrimary, fontWeight: '900' },
});

export { Toast };
export default memo(Toast);
