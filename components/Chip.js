// ForkIt — Chip component

import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { THEME } from '../constants/theme';

/**
 * Toggle chip for filter options.
 * @param {object} props
 * @param {boolean} props.active - Whether the chip is selected
 * @param {string} props.label - Display text
 * @param {string} [props.icon] - Ionicons icon name
 * @param {Function} props.onPress - Press handler
 * @returns {React.JSX.Element}
 */
function Chip({ active, label, icon, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={active ? THEME.white : THEME.textBright}
          style={label ? styles.iconMarginRight6 : null}
        />
      ) : null}
      {label ? (
        <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextIdle]}>
          {label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
  },
  chipIdle: { backgroundColor: THEME.surfaceLight, borderColor: THEME.borderLight },
  chipActive: { backgroundColor: THEME.accentChip, borderColor: THEME.accent },
  chipText: { fontSize: 13, fontWeight: '900' },
  chipTextIdle: { color: THEME.textBold },
  chipTextActive: { color: THEME.white },
  iconMarginRight6: { marginRight: 6 },
});

export { Chip };
export default memo(Chip);
