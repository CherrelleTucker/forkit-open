// ForkIt — FeaturePills component

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { THEME } from '../constants/theme';

// Travel/fork mode toggle pills and quick-action buttons.
/**
 * Travel/fork mode toggles and quick-action buttons.
 * @param {object} props
 * @param {string} props.travelMode - Current travel mode ('walk' | 'drive')
 * @param {Function} props.onToggleTravel - Toggle travel mode handler
 * @param {string} props.forkMode - Current fork mode ('solo' | 'group')
 * @param {Function} props.onToggleFork - Toggle fork mode handler
 * @param {Array} props.favorites - List of favorited places
 * @param {Array} props.blockedIds - List of blocked place entries
 * @param {Function} props.onShowFavorites - Show favorites handler
 * @param {Function} props.onShowBlocked - Show blocked list handler
 * @param {Function} props.onShowCustomPlaces - Show custom places handler
 * @param {object} [props.tourRefsExt] - Refs for tour spotlight targets
 * @returns {React.JSX.Element}
 */
function FeaturePills({
  travelMode,
  onToggleTravel,
  forkMode,
  onToggleFork,
  favorites,
  blockedIds,
  onShowFavorites,
  onShowBlocked,
  onShowCustomPlaces,
  tourRefsExt,
}) {
  const isWalk = travelMode === 'walk';
  const isGroup = forkMode === 'group';
  return (
    <View style={styles.featurePills}>
      <TouchableOpacity
        ref={tourRefsExt?.modeToggle}
        onPress={onToggleTravel}
        style={[styles.footerActionBtn, isWalk && styles.footerActionBtnActive]}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        accessibilityRole="button"
        accessibilityLabel={`Switch to ${isWalk ? 'drive' : 'walk'} mode`}
      >
        <Ionicons
          name={isWalk ? 'walk' : 'car'}
          size={16}
          color={isWalk ? THEME.pop : THEME.textSubtle}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onToggleFork}
        style={[styles.footerActionBtn, isGroup && styles.footerActionBtnActive]}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        accessibilityRole="button"
        accessibilityLabel={`Switch to ${isGroup ? 'solo' : 'group'} mode`}
      >
        <Ionicons
          name={isGroup ? 'people' : 'person'}
          size={16}
          color={isGroup ? THEME.pop : THEME.textSubtle}
        />
      </TouchableOpacity>
      <View ref={tourRefsExt?.listsRow} collapsable={false} style={styles.listsGroup}>
        {favorites.length > 0 && (
          <TouchableOpacity
            onPress={onShowFavorites}
            style={styles.footerActionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={`View ${favorites.length} favorites`}
          >
            <Ionicons name="heart" size={16} color={THEME.accent} />
            <Text style={styles.footerActionText}>{favorites.length}</Text>
          </TouchableOpacity>
        )}
        {blockedIds.length > 0 && (
          <TouchableOpacity
            onPress={onShowBlocked}
            style={styles.footerActionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={`View ${blockedIds.length} blocked restaurants`}
          >
            <Ionicons name="ban" size={16} color={THEME.muted} />
            <Text style={styles.footerActionText}>{blockedIds.length}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onShowCustomPlaces}
          style={styles.footerActionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel="Manage your spots"
        >
          <Ionicons name="add-circle" size={16} color={THEME.pop} />
          <Text style={styles.footerActionText}>Spots</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  featurePills: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },
  listsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: THEME.surfaceHover,
  },
  footerActionBtnActive: {
    backgroundColor: THEME.popBgMedium,
  },
  footerActionText: { color: THEME.textSubtle, fontSize: 13, fontWeight: '800' },
});

export { FeaturePills };
export default FeaturePills;
