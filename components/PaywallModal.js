// ForkIt — PaywallModal component
// V4 feature-based paywall: Free vs Pro vs Pro+ comparison.

import { useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  FREE_SOLO_FORKS,
  FREE_GROUP_FORKS,
  PRO_SOLO_FORKS,
  PRO_GROUP_FORKS,
} from '../constants/config';
import modalStyles from '../constants/sharedStyles';
import { THEME } from '../constants/theme';

/**
 * Plan card with monthly + annual options.
 * @param {object} root0
 * @param {string} root0.tierName
 * @param {string} root0.tierColor
 * @param {string} root0.monthlyPrice
 * @param {string} root0.annualPrice
 * @param {number|null} root0.annualSavings
 * @param {Function} root0.onMonthly
 * @param {Function} root0.onAnnual
 * @param {boolean} root0.highlighted
 * @returns {JSX.Element}
 */
function PlanCard({
  tierName,
  tierColor,
  monthlyPrice,
  annualPrice,
  annualSavings,
  onMonthly,
  onAnnual,
  highlighted,
}) {
  const cardStyle = highlighted
    ? [styles.planCard, styles.planCardHighlighted, { borderColor: tierColor }] // eslint-disable-line react-native/no-inline-styles -- dynamic tier color
    : [styles.planCard];
  return (
    <View style={cardStyle}>
      <Text style={[styles.planTierName, { color: tierColor }]}>{tierName}</Text>
      <TouchableOpacity
        style={styles.planOptionRow}
        onPress={onMonthly}
        activeOpacity={0.7}
        accessibilityLabel={`${tierName} monthly for ${monthlyPrice} per month`}
        accessibilityRole="button"
      >
        <View>
          <Text style={styles.planOptionLabel}>Monthly</Text>
          <Text style={styles.planOptionPriceSub}>{monthlyPrice}/mo</Text>
        </View>
        <View style={[styles.planCtaBtn, { backgroundColor: tierColor }]}>
          <Text style={styles.planCtaText}>Subscribe</Text>
        </View>
      </TouchableOpacity>
      {annualPrice && (
        <TouchableOpacity
          style={styles.planOptionRow}
          onPress={onAnnual}
          activeOpacity={0.7}
          accessibilityLabel={`${tierName} annual for ${annualPrice} per year${annualSavings ? `, save ${annualSavings} percent` : ''}`}
          accessibilityRole="button"
        >
          <View>
            <View style={styles.planOptionLabelRow}>
              <Text style={styles.planOptionLabel}>Annual</Text>
              {annualSavings > 0 && (
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>-{annualSavings}%</Text>
                </View>
              )}
            </View>
            <Text style={styles.planOptionPriceSub}>{annualPrice}/yr</Text>
          </View>
          <View style={[styles.planCtaBtn, { backgroundColor: tierColor }]}>
            <Text style={styles.planCtaText}>Subscribe</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * V4 feature-based paywall modal.
 * Context-aware: highlights the recommended tier based on what triggered the paywall.
 * @param {object} root0
 * @param {boolean} root0.visible
 * @param {Function} root0.onClose
 * @param {string} root0.monthlyPrice
 * @param {string} root0.annualPrice
 * @param {number|null} root0.annualSavings
 * @param {string} root0.proPlusMonthlyPrice
 * @param {string} root0.proPlusAnnualPrice
 * @param {number|null} root0.proPlusAnnualSavings
 * @param {string} root0.context
 * @param {Function} root0.onPurchaseMonthly
 * @param {Function} root0.onPurchaseAnnual
 * @param {Function} root0.onPurchaseProPlusMonthly
 * @param {Function} root0.onPurchaseProPlusAnnual
 * @param {Function} root0.onRestore
 * @returns {JSX.Element}
 */
// eslint-disable-next-line max-lines-per-function -- 3-tier paywall with comparison + plans
function PaywallModal({
  visible,
  onClose,
  monthlyPrice,
  annualPrice,
  annualSavings,
  proPlusMonthlyPrice,
  proPlusAnnualPrice,
  proPlusAnnualSavings,
  context,
  onPurchaseMonthly,
  onPurchaseAnnual,
  onPurchaseProPlusMonthly,
  onPurchaseProPlusAnnual,
  onRestore,
}) {
  const [selectedTab, setSelectedTab] = useState(context === 'upgrade' ? 'pro_plus' : 'pro');

  useEffect(() => {
    if (visible) {
      setSelectedTab(context === 'upgrade' ? 'pro_plus' : 'pro');
    }
  }, [visible, context]);

  return (
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
          accessibilityLabel="Close paywall"
          accessibilityRole="button"
        />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Text style={styles.closeBtnText}>{'\u2715'}</Text>
          </TouchableOpacity>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
            {/* Title */}
            <Text style={styles.title} accessibilityRole="header">
              Pick Your Plan
            </Text>

            {/* V4 feature-based comparison */}
            <View style={styles.comparisonSection}>
              {/* Feature labels column */}
              <View style={styles.featureCol}>
                <Text style={styles.featureHeader}> </Text>
                <Text style={styles.featureLabel}>Searches</Text>
                <Text style={styles.featureLabel}>Filters</Text>
                <Text style={styles.featureLabel}>Pick details</Text>
                <Text style={styles.featureLabel}>Group sessions</Text>
              </View>
              {/* Free */}
              <View style={styles.tierCol}>
                <Text style={[styles.tierHeader, styles.tierHeaderFree]}>Free</Text>
                <Text style={styles.tierValue}>{FREE_SOLO_FORKS}/mo</Text>
                <Text style={styles.tierValue}>Basic</Text>
                <Text style={styles.tierValue}>Name only</Text>
                <Text style={styles.tierValue}>{FREE_GROUP_FORKS}/mo</Text>
              </View>
              {/* Pro */}
              <TouchableOpacity
                style={[styles.tierCol, selectedTab === 'pro' && styles.tierColHighlight]}
                onPress={() => setSelectedTab('pro')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Select Pro plan"
                accessibilityState={{ selected: selectedTab === 'pro' }}
              >
                <Text style={[styles.tierHeader, styles.tierHeaderPro]}>Pro</Text>
                <Text style={styles.tierValuePop}>{PRO_SOLO_FORKS}/mo</Text>
                <Text style={styles.tierValuePop}>All</Text>
                <Text style={styles.tierValuePop}>Full</Text>
                <Text style={styles.tierValuePop}>{PRO_GROUP_FORKS}/mo</Text>
              </TouchableOpacity>
              {/* Pro+ */}
              <TouchableOpacity
                style={[styles.tierCol, selectedTab === 'pro_plus' && styles.tierColHighlightPlus]}
                onPress={() => setSelectedTab('pro_plus')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Select Pro Plus plan"
                accessibilityState={{ selected: selectedTab === 'pro_plus' }}
              >
                <Text style={[styles.tierHeader, styles.tierHeaderProPlus]}>Pro+</Text>
                <Text style={styles.tierValuePop}>{'\u221E'}</Text>
                <Text style={styles.tierValuePop}>All</Text>
                <Text style={styles.tierValuePop}>Full</Text>
                <Text style={styles.tierValuePop}>{'\u221E'}</Text>
              </TouchableOpacity>
            </View>

            {/* Plan purchase cards */}
            {selectedTab === 'pro' ? (
              <PlanCard
                tierName="Pro"
                tierColor={THEME.accent}
                monthlyPrice={monthlyPrice}
                annualPrice={annualPrice}
                annualSavings={annualSavings}
                onMonthly={onPurchaseMonthly}
                onAnnual={onPurchaseAnnual}
                highlighted
              />
            ) : (
              <PlanCard
                tierName="Pro+"
                tierColor={THEME.pop}
                monthlyPrice={proPlusMonthlyPrice}
                annualPrice={proPlusAnnualPrice}
                annualSavings={proPlusAnnualSavings}
                onMonthly={onPurchaseProPlusMonthly}
                onAnnual={onPurchaseProPlusAnnual}
                highlighted
              />
            )}

            {/* CRITICAL — Store Compliance (Apple 3.1.2): price, period, auto-renewal
                disclosure, and cancellation instructions. Removing any part = App Store rejection. */}
            <Text style={styles.termsText}>
              {selectedTab === 'pro'
                ? `${monthlyPrice}/month or ${annualPrice || monthlyPrice}/year. `
                : `${proPlusMonthlyPrice}/month or ${proPlusAnnualPrice || proPlusMonthlyPrice}/year. `}
              Payment will be charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'}{' '}
              account at confirmation. Subscription auto-renews unless canceled at least 24 hours
              before the end of the current period. Manage or cancel anytime in{' '}
              {Platform.OS === 'ios'
                ? 'Settings \u203A Apple ID \u203A Subscriptions'
                : 'Google Play \u203A Subscriptions'}
              .
            </Text>
            <Text style={styles.trustSignal}>
              Payment handled securely by {Platform.OS === 'ios' ? 'Apple' : 'Google'}: we never see
              your card
            </Text>

            {/* CRITICAL — Store Compliance (Apple 3.1.1 / 3.1.5): Terms, Privacy, and
                Restore Purchase links are required in every paywall. Missing = rejection. */}
            <View style={styles.linksRow}>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL('https://forkit-web.vercel.app/terms.html').catch(() => {})
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Terms of Use"
                accessibilityRole="link"
              >
                <Text style={styles.linkText}>Terms</Text>
              </TouchableOpacity>
              <Text style={styles.linkSeparator}> · </Text>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL('https://forkit-web.vercel.app/privacy.html').catch(() => {})
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Privacy Policy"
                accessibilityRole="link"
              >
                <Text style={styles.linkText}>Privacy</Text>
              </TouchableOpacity>
              <Text style={styles.linkSeparator}> · </Text>
              <TouchableOpacity
                onPress={onRestore}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Restore purchase"
                accessibilityRole="button"
              >
                <Text style={styles.linkText}>Restore Purchase</Text>
              </TouchableOpacity>
            </View>

            {/* Not Now */}
            <TouchableOpacity
              onPress={onClose}
              style={styles.notNowWrap}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Not now, close paywall"
              accessibilityRole="button"
            >
              <Text style={styles.notNowText}>Not Now</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: THEME.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: THEME.surfaceModal,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.borderGhost,
    padding: 24,
    maxWidth: 400,
    maxHeight: '85%',
    width: '92%',
    alignItems: 'center',
  },
  scrollContent: {
    width: '100%',
  },

  title: {
    color: THEME.accent,
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  // Comparison grid

  // 3-tier comparison grid
  comparisonSection: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 4,
  },
  featureCol: {
    flex: 1.2,
    gap: 6,
  },
  tierCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    padding: 6,
  },
  tierColHighlight: {
    backgroundColor: THEME.accentBgLight,
    borderWidth: 1,
    borderColor: THEME.accentBorderLight,
  },
  tierColHighlightPlus: {
    backgroundColor: THEME.popBgLight,
    borderWidth: 1,
    borderColor: THEME.popBorderLight,
  },
  featureHeader: {
    fontSize: 12,
    lineHeight: 22,
  },
  featureLabel: {
    color: THEME.textMuted,
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    fontWeight: '500',
    lineHeight: 22,
  },
  tierHeader: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    fontWeight: '700',
    textTransform: 'uppercase',
    lineHeight: 22,
  },
  tierHeaderFree: { color: THEME.textMuted },
  tierHeaderPro: { color: THEME.accent },
  tierHeaderProPlus: { color: THEME.pop },
  tierValue: {
    color: THEME.textMuted,
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
  },
  tierValuePop: {
    color: THEME.pop,
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  // Plan card
  planCard: {
    backgroundColor: THEME.surfaceLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    padding: 16,
    marginBottom: 16,
  },
  planCardHighlighted: {
    borderWidth: 1.5,
  },
  planTierName: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    fontWeight: '700',
    marginBottom: 12,
  },
  planOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    backgroundColor: THEME.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },
  planOptionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planOptionLabel: {
    color: THEME.textPrimary,
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
    fontWeight: '600',
  },
  planOptionPriceSub: {
    color: THEME.textMuted,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 2,
  },
  planCtaBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  planCtaText: {
    color: THEME.dark,
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    fontWeight: '700',
  },
  saveBadge: {
    backgroundColor: THEME.popBgMedium,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  saveBadgeText: {
    color: THEME.pop,
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    fontWeight: '700',
  },

  termsText: {
    color: THEME.textHint,
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  trustSignal: {
    color: THEME.textHint,
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    textAlign: 'center',
    marginBottom: 14,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 2,
  },
  linkSeparator: {
    color: THEME.textHint,
    fontSize: 13,
  },
  linkText: {
    color: THEME.textMuted,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  notNowWrap: {
    paddingVertical: 4,
    alignSelf: 'center',
  },
  notNowText: {
    color: THEME.textMuted,
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    fontWeight: '500',
  },
});

export { PaywallModal };
export default PaywallModal;
