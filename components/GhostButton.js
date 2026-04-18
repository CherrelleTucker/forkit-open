// ForkIt — GhostButton component

import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { THEME, scale } from '../constants/theme';

/**
 * Outline-style secondary action button.
 * @param {object} props
 * @param {string} props.label - Button text
 * @param {string} [props.icon] - Ionicons icon name
 * @param {Function} props.onPress - Press handler
 * @param {boolean} [props.disabled] - Whether the button is disabled
 * @returns {React.JSX.Element}
 */
function GhostButton({ label, icon, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.ghostBtn, disabled ? styles.opacity05 : null]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      {icon ? (
        <Ionicons name={icon} size={16} color={THEME.pop} style={styles.iconMarginRight8} />
      ) : null}
      <Text style={[styles.ghostText, { color: THEME.pop }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(10),
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.pop,
    backgroundColor: THEME.transparent,
    flexGrow: 1,
    minHeight: 44,
  },
  ghostText: { color: THEME.textAlmostWhite, fontWeight: '900' },
  opacity05: { opacity: 0.5 },
  iconMarginRight8: { marginRight: 8 },
});

export { GhostButton };
export default memo(GhostButton);
