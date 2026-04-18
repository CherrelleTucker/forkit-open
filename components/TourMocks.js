// ForkIt — Inline mock components for tour overlay steps.

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { THEME } from '../constants/theme';

import ForkIcon from './ForkIcon';

/**
 * Mini mock of Pro filter pills + pick card with alternatives.
 * @returns {JSX.Element}
 */
function ProFiltersMock() {
  return (
    <View style={styles.container}>
      <View style={styles.pillRow}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>$$</Text>
          <Text style={styles.proBadge}>PRO</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{'\u2605'} 4.0+</Text>
          <Text style={styles.proBadge}>PRO</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Open Now</Text>
          <Text style={styles.proBadge}>PRO</Text>
        </View>
      </View>
      <View style={styles.pickCard}>
        <Text style={styles.pickName}>Viet Taste</Text>
        <View style={styles.pickMeta}>
          <Text style={styles.pickMetaItem}>{'\u2605'} 4.6</Text>
          <Text style={styles.pickMetaItem}>$$</Text>
          <Text style={styles.pickMetaItem}>Open til 10pm</Text>
        </View>
      </View>
      <View style={styles.altRow}>
        <View style={styles.altCard}>
          <Text style={styles.altCat}>Mexican</Text>
          <Text style={styles.altName}>El Pollo Rico</Text>
        </View>
        <View style={styles.altCard}>
          <Text style={styles.altCat}>BBQ</Text>
          <Text style={styles.altName}>Smokey Bones</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Mini mock of favorites, blocked, spots, and history entries.
 * @returns {JSX.Element}
 */
function YourListsMock() {
  return (
    <View style={styles.container}>
      <View style={styles.listItem}>
        <Ionicons name="heart" size={14} color={THEME.accent} />
        <Text style={styles.listText}>Viet Taste</Text>
        <Text style={styles.listMeta}>Favorite</Text>
      </View>
      <View style={styles.listItem}>
        <Ionicons name="ban" size={14} color={THEME.textMuted} />
        <Text style={styles.listText}>Fast Food Chain</Text>
        <Text style={styles.listMeta}>Blocked</Text>
      </View>
      <View style={styles.listItem}>
        <Ionicons name="add-circle" size={14} color={THEME.pop} />
        <Text style={styles.listText}>Mom's House</Text>
        <Text style={styles.listMeta}>Custom Spot</Text>
      </View>
      <View style={styles.listItem}>
        <Ionicons name="time" size={14} color={THEME.textMuted} />
        <Text style={styles.listText}>El Pollo Rico</Text>
        <Text style={styles.listMeta}>Yesterday</Text>
      </View>
    </View>
  );
}

/**
 * Mini mock of the Fork Around group session flow.
 * @returns {JSX.Element}
 */
function ForkAroundMock() {
  return (
    <View style={styles.container}>
      <View style={styles.sessionCard}>
        <Text style={styles.sessionLabel}>Session Code</Text>
        <View style={styles.codeRow}>
          {['F', 'O', 'R', 'K'].map((letter, i) => (
            <View
              key={`code-${i}`} // eslint-disable-line react/no-array-index-key -- fixed-length code display
              style={styles.codeTile}
            >
              <Text style={styles.codeLetter}>{letter}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.participantRow}>
        <View style={styles.participant}>
          <Ionicons name="person" size={12} color={THEME.pop} />
          <Text style={styles.participantFilter}>$</Text>
        </View>
        <View style={styles.participant}>
          <Ionicons name="person" size={12} color={THEME.accent} />
          <Text style={styles.participantFilter}>thai</Text>
        </View>
        <View style={styles.participant}>
          <Ionicons name="person" size={12} color={THEME.pop} />
          <Text style={styles.participantFilter}>nearby</Text>
        </View>
      </View>
      <View style={styles.mergeArrow}>
        <Ionicons name="arrow-down" size={14} color={THEME.textMuted} />
      </View>
      <View style={styles.mergedPick}>
        <ForkIcon size={14} />
        <Text style={styles.mergedName}>Thai Basil Kitchen</Text>
        <Text style={styles.mergedMeta}>$ {'\u00B7'} 0.5 mi</Text>
      </View>
    </View>
  );
}

/**
 * Mini upgrade CTA with tier comparison and upgrade button.
 * @param {object} props
 * @param {Function} [props.onUpgrade] - callback to open paywall
 * @returns {JSX.Element}
 */
function UpgradeMock({ onUpgrade }) {
  return (
    <View style={styles.container}>
      <View style={styles.upgradeGrid}>
        <View style={styles.upgradeCol}>
          <Text style={styles.upgradeHeader}> </Text>
          <Text style={styles.upgradeLabel}>Filters</Text>
          <Text style={styles.upgradeLabel}>Details</Text>
          <Text style={styles.upgradeLabel}>Alternatives</Text>
          <Text style={styles.upgradeLabel}>Searches</Text>
          <Text style={styles.upgradeLabel}>Group forks</Text>
        </View>
        <View style={styles.upgradeCol}>
          <Text style={[styles.upgradeHeader, styles.upgradeHeaderFree]}>Free</Text>
          <Text style={styles.upgradeValue}>Basic</Text>
          <Text style={styles.upgradeValue}>Name</Text>
          <Text style={styles.upgradeValue}>{'\u2014'}</Text>
          <Text style={styles.upgradeValue}>10/mo</Text>
          <Text style={styles.upgradeValue}>1/mo</Text>
        </View>
        <View style={[styles.upgradeCol, styles.upgradeColPro]}>
          <Text style={[styles.upgradeHeader, styles.upgradeHeaderPro]}>Pro</Text>
          <Text style={styles.upgradeValuePop}>All</Text>
          <Text style={styles.upgradeValuePop}>Full</Text>
          <Text style={styles.upgradeValuePop}>2 picks</Text>
          <Text style={styles.upgradeValuePop}>20/mo</Text>
          <Text style={styles.upgradeValuePop}>3/mo</Text>
        </View>
        <View style={styles.upgradeCol}>
          <Text style={[styles.upgradeHeader, styles.upgradeHeaderPlus]}>Pro+</Text>
          <Text style={styles.upgradeValuePop}>All</Text>
          <Text style={styles.upgradeValuePop}>Full</Text>
          <Text style={styles.upgradeValuePop}>2 picks</Text>
          <Text style={styles.upgradeValuePop}>{'\u221E'}</Text>
          <Text style={styles.upgradeValuePop}>{'\u221E'}</Text>
        </View>
      </View>
      {onUpgrade && (
        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={onUpgrade}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Upgrade now"
        >
          <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Map of mock content keys to components.
 */
export const TOUR_MOCKS = {
  proFilters: ProFiltersMock,
  yourLists: YourListsMock,
  forkAround: ForkAroundMock,
  upgrade: UpgradeMock,
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 2,
    gap: 6,
  },
  // Pro Filters mock
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.surfaceLight,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    opacity: 0.6,
  },
  pillText: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  proBadge: {
    color: THEME.accent,
    fontSize: 9,
    fontWeight: '800',
  },
  pickCard: {
    backgroundColor: THEME.surfaceLight,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
  },
  pickName: {
    color: THEME.white,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  pickMeta: {
    flexDirection: 'row',
    gap: 10,
  },
  pickMetaItem: {
    color: THEME.pop,
    fontSize: 11,
    fontWeight: '600',
  },
  altRow: {
    flexDirection: 'row',
    gap: 6,
  },
  altCard: {
    flex: 1,
    backgroundColor: THEME.surfaceLight,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
  },
  altCat: {
    color: THEME.pop,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  altName: {
    color: THEME.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  // Fork Around mock
  sessionCard: {
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionLabel: {
    color: THEME.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 4,
  },
  codeTile: {
    width: 28,
    height: 32,
    backgroundColor: THEME.surfaceLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.pop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeLetter: {
    color: THEME.pop,
    fontSize: 15,
    fontWeight: '900',
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.surfaceLight,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
  },
  participantFilter: {
    color: THEME.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  mergeArrow: {
    alignItems: 'center',
    paddingVertical: 1,
  },
  mergedPick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.surfaceLight,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: THEME.accent,
  },
  mergedName: {
    color: THEME.white,
    fontSize: 13,
    fontWeight: '800',
  },
  mergedMeta: {
    color: THEME.pop,
    fontSize: 10,
    fontWeight: '600',
  },
  // Your Lists mock
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderDim,
  },
  listText: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  listMeta: {
    color: THEME.textMuted,
    fontSize: 11,
  },
  // Upgrade mock
  upgradeGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  upgradeCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  upgradeColPro: {
    backgroundColor: THEME.accentBgLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.accentBorderLight,
    padding: 4,
  },
  upgradeHeader: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    lineHeight: 18,
  },
  upgradeHeaderFree: { color: THEME.textMuted },
  upgradeHeaderPro: { color: THEME.accent },
  upgradeHeaderPlus: { color: THEME.pop },
  upgradeLabel: {
    color: THEME.textMuted,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'left',
  },
  upgradeValue: {
    color: THEME.textMuted,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 18,
  },
  upgradeValuePop: {
    color: THEME.pop,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 18,
  },
  upgradeBtn: {
    backgroundColor: THEME.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  upgradeBtnText: {
    color: THEME.dark,
    fontSize: 14,
    fontWeight: '800',
  },
});
