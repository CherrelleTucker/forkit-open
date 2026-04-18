// Shared modal styles used by BlockedModal, CustomPlacesModal, FavoritesModal, GroupForkModal, InfoModal.

import { StyleSheet } from 'react-native';

import { THEME } from './theme';

const modalStyles = StyleSheet.create({
  infoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: THEME.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  infoClose: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  infoHeading: {
    color: THEME.accent,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 16,
    marginBottom: 5,
  },
  infoText: { color: THEME.textSecondary, fontSize: 15, fontWeight: '600', lineHeight: 22 },
  listCard: {
    backgroundColor: THEME.surfaceModal,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    padding: 24,
    marginHorizontal: 24,
    maxWidth: 380,
    width: '90%',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderDim,
  },
  listItemName: { color: THEME.textPrimary, fontSize: 16, fontWeight: '800' },
  listItemSub: { color: THEME.textMuted, fontSize: 14, marginTop: 2 },
  marginTopNone: { marginTop: 0 },
  flex1: { flex: 1 },
  fontItalic: { fontStyle: 'italic' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.borderMedium,
    backgroundColor: THEME.surfaceInput,
  },
  input: { color: THEME.white, flex: 1, fontWeight: '800' },
});

export { modalStyles };
export default modalStyles;
