// ForkIt — PrimaryButton component

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { THEME, scale } from '../constants/theme';

/**
 * Gradient call-to-action button with optional loading spinner.
 * @param {object} props
 * @param {string} props.label - Button text
 * @param {string} [props.icon] - Ionicons icon name
 * @param {Function} props.onPress - Press handler
 * @param {boolean} [props.disabled] - Whether the button is disabled
 * @param {boolean} [props.loading] - Whether to show loading spinner
 * @param {Animated.Value} props.spinDeg - Animated rotation interpolation
 * @param {Animated.Value} props.bounceY - Animated vertical bounce value
 * @returns {React.JSX.Element}
 */
function PrimaryButton({ label, icon, onPress, disabled, loading, spinDeg, bounceY }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={loading ? 'Finding a restaurant' : label}
      accessibilityState={{ disabled, busy: loading }}
    >
      <LinearGradient
        colors={
          disabled
            ? [THEME.disabledGradientStart, THEME.disabledGradientEnd]
            : [THEME.accent, THEME.accentDark]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.primaryBtn, disabled ? styles.opacity07 : null]}
      >
        <Animated.View
          style={[
            { transform: [{ rotate: spinDeg }, { translateY: bounceY }] },
            styles.animatedForkWrap,
          ]}
        >
          <Ionicons name={icon || 'restaurant'} size={18} color={THEME.white} />
        </Animated.View>

        <Text style={styles.primaryText} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </Text>
        {loading ? <ActivityIndicator color={THEME.white} style={styles.iconMarginLeft10} /> : null}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: scale(14),
    paddingHorizontal: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  primaryText: { color: THEME.white, fontWeight: '900', fontSize: 18 },
  opacity07: { opacity: 0.7 },
  animatedForkWrap: { marginRight: 10 },
  iconMarginLeft10: { marginLeft: 10 },
});

export { PrimaryButton };
export default memo(PrimaryButton);
