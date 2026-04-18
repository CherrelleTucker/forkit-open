// ForkIt — GlassCard component

import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { THEME, scale } from '../constants/theme';

/**
 * Glass-morphism card wrapper with optional title and icon.
 * @param {object} props
 * @param {string} props.title - Card heading text
 * @param {string} [props.icon] - Ionicons icon name
 * @param {React.ReactNode} props.children - Card body content
 * @param {boolean} [props.accent] - Whether to use accent styling
 * @returns {React.JSX.Element}
 */
function GlassCard({ title, icon, children, accent }) {
  return (
    <View style={[styles.cardOuter, accent && styles.cardOuterAccent]}>
      <View style={[styles.card, accent && styles.cardAccent]}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            {icon ? (
              <Ionicons name={icon} size={18} color={accent ? THEME.accent : THEME.textPrimary} />
            ) : null}
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 18,
    marginBottom: scale(10),
    shadowColor: THEME.black,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardOuterAccent: {
    shadowColor: THEME.accent,
    shadowOpacity: 0.4,
  },
  card: {
    borderRadius: 18,
    padding: 4,
    borderWidth: 1,
    borderColor: THEME.borderMedium,
    backgroundColor: THEME.accentBg,
    overflow: 'hidden',
  },
  cardContent: {
    backgroundColor: THEME.surfaceCard,
    borderRadius: 14,
    padding: scale(14),
  },
  cardAccent: {
    borderColor: THEME.accentBorder,
    backgroundColor: THEME.accentBgLight,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardTitle: { color: THEME.white, fontSize: 16, fontWeight: '900' },
});

export { GlassCard };
export default memo(GlassCard);
