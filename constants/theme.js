// ForkIt — Theme constants (colors, layout scaling)

import { Dimensions } from 'react-native';

// Layout constants
const SMALL_SCREEN_THRESHOLD = 700;
const SMALL_SCREEN_SCALE = 0.85;
export const MODAL_CONTENT_RATIO = 0.72;
export const MODAL_LIST_RATIO = 0.55;
export const MODAL_SPOTS_RATIO = 0.35;

// Static screen dimensions for StyleSheet (module-level, doesn't update on rotation)
export const INITIAL_SCREEN_HEIGHT = Dimensions.get('window').height;
const isSmallScreen = INITIAL_SCREEN_HEIGHT < SMALL_SCREEN_THRESHOLD;
export const scale = (size) => (isSmallScreen ? size * SMALL_SCREEN_SCALE : size);

// Theme colors - "Fork it" energy (Orange + Teal + Cream)
export const THEME = {
  // Core palette
  accent: '#FB923C', // Bright orange - primary accent
  accentLight: '#FDBA74', // Lighter orange for gradients
  accentDark: '#EA580C', // Deeper orange for contrast
  pop: '#2DD4BF', // Punchy teal - secondary pop color
  success: '#2DD4BF', // Teal for success states
  cream: '#FEF3E2', // Warm cream for highlights
  muted: '#A1A1AA', // Zinc for muted elements
  white: '#FFFFFF',
  dark: '#0D0D0D', // Near-black background
  black: '#000000',
  background: ['#0D0D0D', '#1A1410', '#0D0D0D'], // Warm dark gradient

  // Alpha variants (reusable throughout UI)
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.75)',
  textMuted: 'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.45)',
  textHint: 'rgba(255,255,255,0.35)',
  textSubtle: 'rgba(255,255,255,0.7)',
  textBright: 'rgba(255,255,255,0.9)',
  textBold: 'rgba(255,255,255,0.88)',
  textIcon: 'rgba(255,255,255,0.6)',
  borderLight: 'rgba(255,255,255,0.18)',
  borderFaint: 'rgba(255,255,255,0.14)',
  borderSubtle: 'rgba(255,255,255,0.12)',
  borderDim: 'rgba(255,255,255,0.08)',
  borderGhost: 'rgba(255,255,255,0.06)',
  surfaceLight: 'rgba(255,255,255,0.06)',
  surfaceHover: 'rgba(255,255,255,0.08)',
  surfaceInput: 'rgba(0,0,0,0.20)',
  overlay: 'rgba(0,0,0,0.75)',
  toastBg: 'rgba(0,0,0,0.75)',

  // Accent alpha variants
  accentBg: 'rgba(251,146,60,0.15)',
  accentBgLight: 'rgba(251,146,60,0.1)',
  accentBorder: 'rgba(251,146,60,0.3)',
  accentBorderLight: 'rgba(251,146,60,0.25)',
  accentChip: 'rgba(251,146,60,0.9)',
  accentToastBorder: 'rgba(251,146,60,0.5)',
  accentToastBorderLight: 'rgba(251,146,60,0.4)',
  popBg: 'rgba(45,212,191,0.06)',
  popBgLight: 'rgba(45,212,191,0.08)',
  popBgMedium: 'rgba(45,212,191,0.15)',
  popBorder: 'rgba(45,212,191,0.25)',
  popBorderLight: 'rgba(45,212,191,0.2)',
  popBorderMedium: 'rgba(45,212,191,0.3)',
  popFaint: 'rgba(45,212,191,0.7)',
  popThumb: 'rgba(45,212,191,0.5)',

  // Brand colors (support modals)
  error: '#FF5E5B',

  // Disabled states
  disabledGradientStart: 'rgba(255,255,255,0.26)',
  disabledGradientEnd: 'rgba(255,255,255,0.18)',

  // StyleSheet-only color tokens (no-color-literals)
  textNearWhite: 'rgba(255,255,255,0.86)',
  textAlmostWhite: 'rgba(255,255,255,0.95)',
  textDimmed: 'rgba(255,255,255,0.40)',
  textHalf: 'rgba(255,255,255,0.50)',
  borderMedium: 'rgba(255,255,255,0.16)',
  borderThin: 'rgba(255,255,255,0.10)',
  borderHover: 'rgba(255,255,255,0.20)',
  surfaceClearBtn: 'rgba(255,255,255,0.10)',
  surfaceCard: 'rgba(13,13,13,0.85)',
  surfaceModal: 'rgba(26,20,16,0.95)',
  surfaceDropdown: 'rgba(26,20,16,0.98)',
  surfaceFavAction: 'rgba(255,255,255,0.04)',
  transparent: 'transparent',

  // Tour colors — teal-led (tour = solution/guidance, not problem)
  tourOverlay: 'rgba(0,0,0,0.75)',
  tourSpotBorder: 'rgba(45,212,191,0.5)',
  tourSpotBg: 'transparent',
  tourCard: 'rgba(16,22,22,0.97)', // cool-warm dark
  tourCardBorder: 'rgba(45,212,191,0.25)', // teal glow border
  tourGold: '#2DD4BF', // teal (step counter, active dot)
  tourText: 'rgba(255,255,255,0.78)', // brighter body text
  tourDotBg: 'rgba(255,255,255,0.18)',
  tourBtnBg: '#2DD4BF', // teal (solution energy)
  tourBtnText: '#0D0D0D', // dark on teal
  tourSkipText: 'rgba(255,255,255,0.45)',
  tourLaunchBg: 'rgba(45,212,191,0.1)',
  tourLaunchBorder: 'rgba(45,212,191,0.3)',
  tourMockYoutube: 'rgba(255,0,0,0.15)',
  tourMockGoogle: 'rgba(66,133,244,0.15)',
  tourMockAllrecipes: 'rgba(255,165,0,0.15)',

  // Third-party / branding
  googleText: '#1F1F1F',
  freeBadgeBg: 'rgba(255,255,255,0.08)',
  proBadgeBg: 'rgba(45,212,191,0.15)',
  freeBadgeText: 'rgba(255,255,255,0.5)',

  // Destructive action colors
  destructive: '#EF4444',
  destructiveBorder: 'rgba(239,68,68,0.3)',
  destructiveBg: 'rgba(239,68,68,0.1)',
};
