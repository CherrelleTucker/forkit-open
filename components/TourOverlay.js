// ForkIt — TourOverlay component
// Interactive spotlight tour overlay with step-by-step tooltips.

import { Modal, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

import {
  TOUR_STEP_COUNT,
  TOUR_SPOT_PAD,
  TOUR_SPOT_RADIUS,
  TOUR_ARROW_OFFSET,
} from '../constants/config';
import { TOUR_STEPS } from '../constants/content';
import { THEME } from '../constants/theme';

import { TOUR_MOCKS } from './TourMocks';

/**
 * Tour spotlight overlay modal.
 * @param {object} props
 * @param {boolean} props.visible - Whether the tour overlay is shown
 * @param {number} props.tourStep - Current tour step index
 * @param {object|null} props.tourSpotLayout - Layout rect of the spotlighted element
 * @param {() => void} props.onAdvance - Advance to next step
 * @param {() => void} props.onRetreat - Go back one step
 * @param {() => void} props.onClose - Close/skip the tour
 * @param {string} props.priceLabel - Live price string from store (e.g. "$1.99")
 * @param {Function} [props.onUpgrade] - Callback to open paywall from upgrade step
 * @returns {JSX.Element}
 */
// eslint-disable-next-line max-lines-per-function -- spotlight overlay with tooltip positioning logic
function TourOverlay({
  visible,
  tourStep,
  tourSpotLayout,
  onAdvance,
  onRetreat,
  onClose,
  priceLabel,
  onUpgrade,
}) {
  const { height: screenH, width: screenW } = useWindowDimensions();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.tourOverlay} accessibilityViewIsModal>
        {/* SVG overlay with cutout hole for spotlight */}
        <Svg style={StyleSheet.absoluteFill} width={screenW} height={screenH}>
          <Defs>
            <Mask id="spotlight-mask">
              {/* White = visible overlay */}
              <Rect x={0} y={0} width={screenW} height={screenH} fill="white" />
              {/* Black = transparent cutout */}
              {tourSpotLayout && (
                <Rect
                  x={tourSpotLayout.x - TOUR_SPOT_PAD}
                  y={tourSpotLayout.y - TOUR_SPOT_PAD}
                  width={tourSpotLayout.width + TOUR_SPOT_PAD * 2}
                  height={tourSpotLayout.height + TOUR_SPOT_PAD * 2}
                  rx={
                    // eslint-disable-next-line security/detect-object-injection -- tourStep is a controlled numeric index
                    TOUR_STEPS[tourStep]?.ref === 'infoBtn' ? 999 : TOUR_SPOT_RADIUS
                  }
                  fill="black"
                />
              )}
            </Mask>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={screenW}
            height={screenH}
            fill="rgba(0,0,0,0.80)"
            mask="url(#spotlight-mask)"
          />
          {/* Teal border around the cutout */}
          {tourSpotLayout && (
            <Rect
              x={tourSpotLayout.x - TOUR_SPOT_PAD}
              y={tourSpotLayout.y - TOUR_SPOT_PAD}
              width={tourSpotLayout.width + TOUR_SPOT_PAD * 2}
              height={tourSpotLayout.height + TOUR_SPOT_PAD * 2}
              rx={
                // eslint-disable-next-line security/detect-object-injection -- tourStep is a controlled numeric index
                TOUR_STEPS[tourStep]?.ref === 'infoBtn' ? 999 : TOUR_SPOT_RADIUS
              }
              fill="none"
              stroke={THEME.tourSpotBorder}
              strokeWidth={2}
            />
          )}
        </Svg>

        {(() => {
          const screenMid = screenH / 2;
          // Estimate tooltip height — generous to account for large font scaling
          const TOOLTIP_EST_HEIGHT = 300;
          const TOP_SAFE = 60; // keep clear of status bar / notch
          const BOTTOM_SAFE = 60; // keep clear of nav bar / gesture area
          const spotBelow = tourSpotLayout
            ? tourSpotLayout.y + tourSpotLayout.height / 2 < screenMid
            : false;
          let tooltipBelow = spotBelow;
          // If placing below would push past the screen bottom, flip above
          if (
            tourSpotLayout &&
            tooltipBelow &&
            tourSpotLayout.y + tourSpotLayout.height + TOUR_SPOT_PAD * 3 + TOOLTIP_EST_HEIGHT >
              screenH - BOTTOM_SAFE
          ) {
            tooltipBelow = false;
          }
          let tooltipPosition = styles.tourTooltipCentered;
          if (tourSpotLayout && tooltipBelow) {
            const top = Math.max(
              tourSpotLayout.y + tourSpotLayout.height + TOUR_SPOT_PAD * 3,
              TOP_SAFE,
            );
            tooltipPosition = { top };
          } else if (tourSpotLayout) {
            const bottom = Math.max(screenH - tourSpotLayout.y + TOUR_SPOT_PAD, BOTTOM_SAFE);
            tooltipPosition = { bottom };
          }
          return (
            <View style={[styles.tourTooltip, tooltipPosition]} pointerEvents="box-none">
              {tourSpotLayout && (
                <View
                  style={[
                    styles.tourArrow,
                    tooltipBelow ? styles.tourArrowUp : styles.tourArrowDown,
                    {
                      left: Math.min(
                        Math.max(
                          tourSpotLayout.x + tourSpotLayout.width / 2 - TOUR_ARROW_OFFSET,
                          10,
                        ),
                        screenW - TOUR_ARROW_OFFSET * 2,
                      ),
                    },
                  ]}
                />
              )}
              <Text style={styles.tourStepCount}>
                {tourStep + 1} of {TOUR_STEP_COUNT}
              </Text>
              {/* eslint-disable-next-line security/detect-object-injection -- tourStep is a controlled numeric index */}
              <Text style={styles.tourTitle}>{TOUR_STEPS[tourStep]?.title}</Text>
              {/* eslint-disable-next-line security/detect-object-injection -- tourStep is a controlled numeric index */}
              <Text style={styles.tourDesc}>
                {(() => {
                  // eslint-disable-next-line security/detect-object-injection -- tourStep is a controlled numeric index
                  const stepDesc = TOUR_STEPS[tourStep]?.desc;
                  return typeof stepDesc === 'function' ? stepDesc(priceLabel) : stepDesc;
                })()}
              </Text>

              {/* Inline mock rendering */}
              {(() => {
                // eslint-disable-next-line security/detect-object-injection -- tourStep is a controlled numeric index
                const mockKey = TOUR_STEPS[tourStep]?.mockContent;
                // eslint-disable-next-line security/detect-object-injection -- mockKey is from TOUR_STEPS constant
                const MockComponent = mockKey ? TOUR_MOCKS[mockKey] : null;
                return MockComponent ? <MockComponent onUpgrade={onUpgrade} /> : null;
              })()}

              <View style={styles.tourFooter}>
                {tourStep > 0 ? (
                  <TouchableOpacity
                    style={styles.tourBackBtn}
                    onPress={onRetreat}
                    accessibilityRole="button"
                    accessibilityLabel="Previous step"
                  >
                    <Text style={styles.tourBackText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.tourBackSpacer} />
                )}
                <View style={styles.tourDots}>
                  {Array.from({ length: TOUR_STEP_COUNT }).map((_, i) => (
                    <View
                      key={`dot-${i}`} // eslint-disable-line react/no-array-index-key -- fixed-length dot indicators
                      style={[styles.tourDot, i === tourStep && styles.tourDotActive]}
                    />
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.tourNextBtn}
                  onPress={onAdvance}
                  accessibilityRole="button"
                  accessibilityLabel={
                    tourStep === TOUR_STEP_COUNT - 1 ? 'Finish tour' : 'Next step'
                  }
                >
                  <Text style={styles.tourNextText}>
                    {tourStep === TOUR_STEP_COUNT - 1 ? 'Fork It!' : 'Next'}
                  </Text>
                </TouchableOpacity>
              </View>

              {tourStep < TOUR_STEP_COUNT - 1 && (
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.tourSkip}
                  accessibilityRole="button"
                  accessibilityLabel="Close tour"
                >
                  <Text style={styles.tourSkipText}>Close tour</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tourOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  tourTooltip: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: THEME.tourCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.tourCardBorder,
    zIndex: 2002,
    shadowColor: THEME.pop,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  tourTooltipCentered: {
    top: '25%',
  },
  tourArrow: {
    position: 'absolute',
    width: 14,
    height: 14,
    backgroundColor: THEME.tourCard,
    borderWidth: 1,
    borderColor: THEME.tourCardBorder,
    transform: [{ rotate: '45deg' }],
  },
  tourArrowUp: {
    top: -8,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tourArrowDown: {
    bottom: -8,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tourStepCount: {
    fontSize: 12,
    color: THEME.tourGold,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  tourTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.white,
    marginBottom: 7,
  },
  tourDesc: {
    fontSize: 15,
    color: THEME.tourText,
    lineHeight: 22,
    marginBottom: 12,
  },
  tourFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  tourDots: {
    flexDirection: 'row',
    gap: 4,
  },
  tourDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.tourDotBg,
  },
  tourDotActive: {
    backgroundColor: THEME.tourGold,
    width: 16,
    borderRadius: 3,
  },
  tourBackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tourBackText: {
    color: THEME.tourSkipText,
    fontWeight: '700',
    fontSize: 14,
  },
  tourBackSpacer: { width: 56 },
  tourNextBtn: {
    backgroundColor: THEME.tourBtnBg,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    flexShrink: 1,
  },
  tourNextText: {
    color: THEME.tourBtnText,
    fontWeight: '800',
    fontSize: 14,
  },
  tourSkip: {
    alignSelf: 'center',
    marginTop: 10,
  },
  tourSkipText: {
    fontSize: 13,
    color: THEME.tourSkipText,
  },
});

export { TourOverlay };
export default TourOverlay;
