// ForkIt — FavoritesModal component
// Modal for viewing, editing, and managing favorite restaurants.

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { TOAST_SHORT } from '../constants/config';
import modalStyles from '../constants/sharedStyles';
import { THEME, INITIAL_SCREEN_HEIGHT, MODAL_LIST_RATIO } from '../constants/theme';
import useInlineConfirm from '../hooks/useInlineConfirm';
import { toggleFavorite, updateFavorite } from '../utils/favorites';
import { openMapsSearchByText } from '../utils/helpers';

/**
 * Favorites list modal.
 * @param {object} props
 * @param {boolean} props.visible - Whether the modal is shown
 * @param {() => void} props.onClose - Close the modal
 * @param {Array} props.favorites - Array of favorite places
 * @param {(favs: Array) => void} props.setFavorites - Setter for favorites
 * @param {(text: string, kind: string, ms: number) => void} props.showToast - Show a toast message
 * @returns {JSX.Element}
 */
// eslint-disable-next-line max-lines-per-function -- modal with expand/collapse, edit, and delete logic
function FavoritesModal({ visible, onClose, favorites, setFavorites, showToast }) {
  const { startConfirm, cancelConfirm, isConfirming } = useInlineConfirm();
  const [expandedFavId, setExpandedFavId] = useState(null);
  const [editingFavId, setEditingFavId] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editDishes, setEditDishes] = useState('');

  function handleClose() {
    cancelConfirm();
    setExpandedFavId(null);
    setEditingFavId(null);
    onClose();
  }

  const keyExtractor = useCallback((item) => item.place_id, []);

  const renderItem = useCallback(
    // eslint-disable-next-line max-lines-per-function -- each favorite renders expand/edit/delete UI
    ({ item: fav }) => {
      const isExpanded = expandedFavId === fav.place_id;
      const isEditing = editingFavId === fav.place_id;
      return (
        <View style={[modalStyles.listItem, styles.listItemColumn]}>
          {/* Collapsed row — always visible */}
          <TouchableOpacity
            onPress={() => {
              setExpandedFavId(isExpanded ? null : fav.place_id);
              setEditingFavId(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${fav.name}`}
          >
            <View style={styles.rowCenter}>
              <View style={modalStyles.flex1}>
                <Text style={modalStyles.listItemName}>{fav.name}</Text>
                <Text style={modalStyles.listItemSub}>
                  {fav.rating ? `${fav.rating} \u2605` : ''}
                  {fav.vicinity ? ` \u00B7 ${fav.vicinity}` : ''}
                </Text>
                {!isExpanded && fav.userNotes ? (
                  <Text style={[modalStyles.listItemSub, modalStyles.fontItalic]} numberOfLines={1}>
                    {fav.userNotes}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={THEME.textFaint}
              />
            </View>
          </TouchableOpacity>

          {/* Expanded detail */}
          {isExpanded && (
            <View style={styles.favDetailSection}>
              {/* Notes & dishes — edit or read-only */}
              {isEditing ? (
                <View style={styles.marginTop8}>
                  <View style={modalStyles.inputWrap}>
                    <Ionicons name="chatbubble-outline" size={14} color={THEME.textHalf} />
                    <TextInput
                      value={editNotes}
                      onChangeText={setEditNotes}
                      placeholder="Personal notes..."
                      placeholderTextColor={THEME.textHint}
                      style={[modalStyles.input, styles.inputFontSize]}
                      accessibilityLabel="Personal notes for this favorite"
                      keyboardAppearance="dark"
                      multiline
                    />
                  </View>
                  <View style={[modalStyles.inputWrap, styles.inputMarginTop6]}>
                    <Ionicons name="restaurant-outline" size={14} color={THEME.textHalf} />
                    <TextInput
                      value={editDishes}
                      onChangeText={setEditDishes}
                      placeholder="What to order..."
                      placeholderTextColor={THEME.textHint}
                      style={[modalStyles.input, styles.inputFontSize]}
                      accessibilityLabel="Dishes to order at this favorite"
                      keyboardAppearance="dark"
                      multiline
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.addBtn, styles.editSaveBtn]}
                    onPress={() => {
                      updateFavorite(
                        fav.place_id,
                        {
                          userNotes: editNotes.trim(),
                          userDishes: editDishes.trim(),
                        },
                        favorites,
                        setFavorites,
                      );
                      setEditingFavId(null);
                      showToast('Saved!', 'success', TOAST_SHORT);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Save notes"
                  >
                    <Ionicons name="checkmark" size={16} color={THEME.white} />
                    <Text style={styles.addBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.marginTop8}>
                  {fav.userNotes ? (
                    <Text style={styles.favDetailText}>
                      <Text style={styles.favDetailLabel}>Notes: </Text>
                      {fav.userNotes}
                    </Text>
                  ) : null}
                  {fav.userDishes ? (
                    <Text style={styles.favDetailText}>
                      <Text style={styles.favDetailLabel}>Order: </Text>
                      {fav.userDishes}
                    </Text>
                  ) : null}
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.favActionRow}>
                <TouchableOpacity
                  onPress={() => openMapsSearchByText(fav.vicinity || fav.name)}
                  style={styles.favActionBtn}
                  accessibilityLabel={`Directions to ${fav.name}`}
                  accessibilityRole="button"
                >
                  <Ionicons name="map-outline" size={16} color={THEME.pop} />
                  <Text style={styles.favActionBtnText}>Directions</Text>
                </TouchableOpacity>
                {!isEditing && (
                  <TouchableOpacity
                    onPress={() => {
                      setEditNotes(fav.userNotes || '');
                      setEditDishes(fav.userDishes || '');
                      setEditingFavId(fav.place_id);
                    }}
                    style={styles.favActionBtn}
                    accessibilityLabel={`Edit notes for ${fav.name}`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="pencil-outline" size={16} color={THEME.textSubtle} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    if (isConfirming(fav.place_id)) {
                      cancelConfirm();
                      toggleFavorite(fav, favorites, setFavorites);
                      setExpandedFavId(null);
                      showToast('Removed from favorites.', 'success', TOAST_SHORT);
                    } else {
                      startConfirm(fav.place_id);
                    }
                  }}
                  style={[styles.favActionBtn, styles.confirmTap]}
                  accessibilityLabel={
                    isConfirming(fav.place_id) ? `Confirm remove ${fav.name}` : `Remove ${fav.name}`
                  }
                  accessibilityRole="button"
                >
                  {isConfirming(fav.place_id) ? (
                    <>
                      <Text style={styles.confirmText}>Tap to confirm</Text>
                      <Ionicons name="checkmark-circle" size={16} color={THEME.destructive} />
                    </>
                  ) : (
                    <Ionicons name="heart-dislike-outline" size={16} color={THEME.accent} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      );
    },
    [
      expandedFavId,
      editingFavId,
      editNotes,
      editDishes,
      favorites,
      setFavorites,
      showToast,
      isConfirming,
      startConfirm,
      cancelConfirm,
    ],
  );

  const emptyComponent = (
    <Text style={modalStyles.infoText}>
      No favorites yet. Tap the heart on a result to save it.
    </Text>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={modalStyles.infoOverlay} accessibilityViewIsModal>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
          accessibilityLabel="Close favorites"
          accessibilityRole="button"
        />
        <View style={modalStyles.listCard}>
          <TouchableOpacity
            style={modalStyles.infoClose}
            onPress={handleClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={THEME.textIcon} />
          </TouchableOpacity>
          <Text
            style={[modalStyles.infoHeading, modalStyles.marginTopNone]}
            accessibilityRole="header"
          >
            Favorites ({favorites.length})
          </Text>
          <FlatList
            data={favorites}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            extraData={`${expandedFavId}|${editingFavId}`}
            style={styles.modalListHeight}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={emptyComponent}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  listItemColumn: { flexDirection: 'column', alignItems: 'stretch' },
  modalListHeight: { maxHeight: INITIAL_SCREEN_HEIGHT * MODAL_LIST_RATIO },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  marginTop8: { marginTop: 8 },
  inputMarginTop6: { marginTop: 6 },
  inputFontSize: { fontSize: 14 },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: THEME.accent,
  },
  addBtnText: { color: THEME.white, fontWeight: '700', fontSize: 14 },
  editSaveBtn: { marginTop: 8, paddingVertical: 8 },
  favDetailSection: { width: '100%', paddingTop: 10, paddingBottom: 4 },
  favDetailLabel: { color: THEME.textMuted, fontSize: 13, fontWeight: '800' },
  favDetailText: { color: THEME.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 4 },
  favActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  favActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    backgroundColor: THEME.surfaceFavAction,
  },
  favActionBtnText: { color: THEME.textSecondary, fontSize: 13, fontWeight: '800' },
  confirmTap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confirmText: { color: THEME.destructive, fontSize: 11, fontWeight: '700' },
});

export { FavoritesModal };
export default FavoritesModal;
