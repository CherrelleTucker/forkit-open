// useTour — Interactive tour state, refs, and navigation logic.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, StatusBar } from 'react-native';

import {
  TOUR_VERSION,
  TOUR_STEP_COUNT,
  TOUR_LAUNCH_DELAY,
  TOUR_EXPAND_DELAY,
  TOUR_SCROLL_DELAY_MS,
} from '../constants/config';
import { TOUR_STEPS } from '../constants/content';
import { STORAGE_KEYS } from '../constants/storage';

/**
 * Hook that manages the interactive tour overlay.
 * @param {object} opts
 * @param {boolean} opts.filtersExpanded - Whether the filters panel is expanded
 * @param {(v: boolean) => void} opts.setFiltersExpanded - Toggle filters panel
 * @param {(mode: string) => void} opts.setForkMode - Set fork mode (solo/group)
 * @param {{current: {scrollTo: Function}}} opts.scrollViewRef - Main scroll view ref
 * @param {{current: number}} opts.scrollOffsetRef - Current scroll offset ref
 * @param {(title: string, message?: string, buttons?: Array) => void} opts.showDialog - Branded dialog function
 * @returns {object} Tour state, refs, and control functions
 */
// eslint-disable-next-line max-lines-per-function -- tour hook managing refs, step navigation, and spotlight measurement
export default function useTour({
  filtersExpanded,
  setFiltersExpanded,
  setForkMode,
  scrollViewRef,
  scrollOffsetRef,
  showDialog,
}) {
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourSpotLayout, setTourSpotLayout] = useState(null);

  // Tour target refs
  const forkBtnRef = useRef(null);
  const modeToggleRef = useRef(null);
  const filtersToggleRef = useRef(null);
  const distanceRowRef = useRef(null);
  const maxDamageRowRef = useRef(null);
  const ratingRowRef = useRef(null);
  const keywordFieldsRef = useRef(null);
  const openNowRowRef = useRef(null);
  const hiddenGemsRowRef = useRef(null);
  const spotsRowRef = useRef(null);
  const listsRowRef = useRef(null);
  const forkAroundBtnRef = useRef(null);
  const infoBtnRef = useRef(null);
  const historyBtnRef = useRef(null);

  const tourRefs = useMemo(
    () => ({
      forkBtn: forkBtnRef,
      modeToggle: modeToggleRef,
      filtersToggle: filtersToggleRef,
      distanceRow: distanceRowRef,
      maxDamageRow: maxDamageRowRef,
      ratingRow: ratingRowRef,
      keywordFields: keywordFieldsRef,
      openNowRow: openNowRowRef,
      hiddenGemsRow: hiddenGemsRowRef,
      spotsRow: spotsRowRef,
      listsRow: listsRowRef,
      forkAroundBtn: forkAroundBtnRef,
      infoBtn: infoBtnRef,
      historyBtn: historyBtnRef,
    }),
    [],
  );

  function measureTourRef(refName) {
    return new Promise((resolve) => {
      const ref = tourRefs[refName]; // eslint-disable-line security/detect-object-injection -- refName is from TOUR_STEPS constant
      if (!ref?.current?.measureInWindow) {
        resolve(null);
        return;
      }
      ref.current.measureInWindow((x, y, width, height) => {
        if (width === 0 && height === 0) {
          resolve(null);
          return;
        }
        // On Android, measureInWindow returns coords relative to the window
        // (below status bar), but statusBarTranslucent Modal starts at screen top.
        // Add status bar height so the spotlight aligns correctly.
        const offsetY = Platform.OS === 'android' ? y + (StatusBar.currentHeight || 0) : y;
        resolve({ x, y: offsetY, width, height });
      });
    });
  }

  async function startTour() {
    setTourStep(0);
    setFiltersExpanded(false);
    // Scroll to top so spotlight measurements are accurate
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    // Brief delay to let scroll settle before measuring
    await new Promise((r) => {
      setTimeout(r, TOUR_LAUNCH_DELAY);
    });
    const layout = await measureTourRef('forkBtn');
    setTourSpotLayout(layout);
    setShowTour(true);
  }

  async function goToTourStep(target) {
    if (target < 0 || target >= TOUR_STEP_COUNT) return;

    const stepDef = TOUR_STEPS[target]; // eslint-disable-line security/detect-object-injection -- target is a bounded numeric index

    // Expand filters if needed for this step
    const needsFilters =
      stepDef.expandFilters ||
      ['distanceRow', 'maxDamageRow', 'keywordFields', 'openNowRow', 'hiddenGemsRow'].includes(
        stepDef.ref,
      );
    if (needsFilters && !filtersExpanded) {
      setFiltersExpanded(true);
    } else if (
      !needsFilters &&
      filtersExpanded &&
      ['forkBtn', 'modeToggle'].includes(stepDef.ref)
    ) {
      setFiltersExpanded(false);
    }

    // Switch to group mode for forkAroundBtn step, solo for others
    if (stepDef.ref === 'forkAroundBtn') {
      setForkMode('group');
    } else {
      setForkMode('solo');
    }

    // Steps with no ref — center the tooltip (no spotlight)
    if (!stepDef.ref) {
      setTourStep(target);
      setTourSpotLayout(null);
      return;
    }

    // Wait for filter expand/collapse to settle before measuring
    await new Promise((r) => setTimeout(r, TOUR_EXPAND_DELAY));
    await new Promise((r) => requestAnimationFrame(r));

    let layout = await measureTourRef(stepDef.ref);

    // If the element is off-screen, gently scroll just enough to bring it into view
    if (layout && scrollViewRef.current) {
      const screenH = Dimensions.get('window').height;
      const VIEW_PAD = 140; // breathing room for tooltip
      const currentOffset = scrollOffsetRef?.current || 0;
      const elementBottom = layout.y + layout.height;
      let newOffset = null;

      if (elementBottom > screenH - VIEW_PAD) {
        // Element below visible area — scroll down just enough
        newOffset = currentOffset + (elementBottom - screenH + VIEW_PAD);
      } else if (layout.y < VIEW_PAD) {
        // Element above visible area — scroll up just enough
        newOffset = Math.max(0, currentOffset - (VIEW_PAD - layout.y));
      }

      if (newOffset !== null) {
        scrollViewRef.current.scrollTo({ y: newOffset, animated: true });
        await new Promise((r) => setTimeout(r, TOUR_SCROLL_DELAY_MS));
        await new Promise((r) => requestAnimationFrame(r));
        layout = await measureTourRef(stepDef.ref);
      }
    }

    setTourStep(target);
    setTourSpotLayout(layout);
  }

  function advanceTour() {
    if (tourStep + 1 >= TOUR_STEP_COUNT) {
      endTour();
      return;
    }
    goToTourStep(tourStep + 1);
  }

  function retreatTour() {
    if (tourStep > 0) goToTourStep(tourStep - 1);
  }

  function confirmCloseTour() {
    showDialog(
      'Close tour?',
      'You can replay it anytime from the info icon at the bottom of the screen.',
      [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Close', onPress: endTour },
      ],
    );
  }

  function endTour() {
    setShowTour(false);
    setTourStep(0);
    setTourSpotLayout(null);
    setForkMode('solo');
    setFiltersExpanded(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    AsyncStorage.setItem(STORAGE_KEYS.TOUR_VERSION, String(TOUR_VERSION)).catch(() => {});
  }

  // Check if tour should show (first launch or new tour version)
  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEYS.TOUR_VERSION);
        if (!seen || Number(seen) < TOUR_VERSION) {
          setTimeout(() => startTour(), TOUR_LAUNCH_DELAY);
        }
      } catch (_) {
        // Non-critical
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    showTour,
    tourStep,
    tourSpotLayout,
    tourRefs,
    startTour,
    advanceTour,
    retreatTour,
    endTour,
    confirmCloseTour,
  };
}
