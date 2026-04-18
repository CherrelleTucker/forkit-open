/* eslint-disable max-lines -- CRUD modal with form, address autocomplete, search, and inline editing */
// ForkIt — CustomPlacesModal component
// Modal for adding, editing, searching, and removing custom spots.

import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SPOTS_SEARCH_THRESHOLD,
  DEBOUNCE_DELAY,
  SPOTS_ERROR_TOAST_MS,
  ADDED_TOAST_MS,
  TOAST_SHORT,
} from '../constants/config';
import modalStyles from '../constants/sharedStyles';
import { STORAGE_KEYS } from '../constants/storage';
import { THEME, INITIAL_SCREEN_HEIGHT, MODAL_SPOTS_RATIO } from '../constants/theme';
import useInlineConfirm from '../hooks/useInlineConfirm';
import { fetchAddressSuggestions, getPlaceDetails } from '../utils/api';
import { addCustomPlace, dupeMessage, findDupe, removeCustomPlace } from '../utils/customPlaces';
import { safeStore, normalize, openMapsSearchByText } from '../utils/helpers';

/**
 * Custom Places (Your Spots) modal.
 * @param {object} props
 * @param {boolean} props.visible - Whether the modal is shown
 * @param {() => void} props.onClose - Close the modal
 * @param {Array} props.customPlaces - Array of custom spots
 * @param {(places: Array) => void} props.setCustomPlaces - Setter for custom places
 * @param {object|null} props.coords - Current user coordinates for address autocomplete
 * @param {(text: string, kind: string, ms: number) => void} props.showToast - Show a toast message
 * @returns {JSX.Element}
 */
// eslint-disable-next-line max-lines-per-function -- modal with form state, CRUD, and address autocomplete
function CustomPlacesModal({ visible, onClose, customPlaces, setCustomPlaces, coords, showToast }) {
  const { startConfirm, cancelConfirm, isConfirming } = useInlineConfirm();
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomAddress, setNewCustomAddress] = useState('');
  const [newCustomNotes, setNewCustomNotes] = useState('');
  const [newCustomTags, setNewCustomTags] = useState('');
  const [editingSpotId, setEditingSpotId] = useState(null);
  const [spotsSearch, setSpotsSearch] = useState('');
  const [spotsMsg, setSpotsMsg] = useState(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const addressDebounceRef = useRef(null);

  function handleClose() {
    cancelConfirm();
    setSpotsSearch('');
    setSpotsMsg(null);
    setAddressSuggestions([]);
    setEditingSpotId(null);
    setNewCustomName('');
    setNewCustomAddress('');
    setNewCustomNotes('');
    setNewCustomTags('');
    onClose();
  }

  function handleBackdropPress() {
    cancelConfirm();
    setSpotsSearch('');
    setSpotsMsg(null);
    setAddressSuggestions([]);
    onClose();
  }

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
          onPress={handleBackdropPress}
          accessibilityLabel="Close your spots"
          accessibilityRole="button"
        />
        <View style={modalStyles.listCard}>
          <TouchableOpacity
            style={modalStyles.infoClose}
            onPress={() => {
              setSpotsSearch('');
              setSpotsMsg(null);
              setAddressSuggestions([]);
              onClose();
            }}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={THEME.textIcon} />
          </TouchableOpacity>
          <Text
            style={[modalStyles.infoHeading, modalStyles.marginTopNone]}
            accessibilityRole="header"
          >
            Your Spots ({customPlaces.length})
          </Text>

          <View style={styles.customForm}>
            {spotsMsg && (
              <Text
                style={[
                  styles.spotsMsg,
                  { color: spotsMsg.type === 'error' ? THEME.error : THEME.pop },
                ]}
              >
                {spotsMsg.text}
              </Text>
            )}
            <View style={modalStyles.inputWrap}>
              <Ionicons name="restaurant-outline" size={16} color={THEME.textSubtle} />
              <TextInput
                value={newCustomName}
                onChangeText={(t) => {
                  setNewCustomName(t);
                  setSpotsMsg(null);
                }}
                placeholder="Name (e.g. Mom's house)"
                accessibilityLabel="Name of your custom spot"
                placeholderTextColor={THEME.textFaint}
                style={modalStyles.input}
                keyboardAppearance="dark"
                returnKeyType="next"
              />
            </View>
            <View style={styles.addressFieldWrap}>
              <View style={modalStyles.inputWrap}>
                <Ionicons name="location-outline" size={16} color={THEME.textSubtle} />
                <TextInput
                  value={newCustomAddress}
                  accessibilityLabel="Address of your custom spot"
                  onChangeText={(text) => {
                    setNewCustomAddress(text);
                    setSelectedCoords(null);
                    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
                    if (text.trim().length >= 3) {
                      addressDebounceRef.current = setTimeout(async () => {
                        const { suggestions, error } = await fetchAddressSuggestions(text, coords);
                        setAddressSuggestions(suggestions);
                        if (error === 'rate_limit') {
                          setSpotsMsg({
                            type: 'error',
                            text: 'Slow down: too many requests. Wait a moment.',
                          });
                          setTimeout(() => setSpotsMsg(null), SPOTS_ERROR_TOAST_MS);
                        }
                      }, DEBOUNCE_DELAY);
                    } else {
                      setAddressSuggestions([]);
                    }
                  }}
                  placeholder="Address (select a Google suggestion for distance filtering)"
                  placeholderTextColor={THEME.textFaint}
                  style={modalStyles.input}
                  keyboardAppearance="dark"
                  returnKeyType="next"
                />
              </View>
              {addressSuggestions.length > 0 && (
                <View style={styles.suggestionsDropdown}>
                  {addressSuggestions.map((s) => (
                    <TouchableOpacity
                      key={s.placeId}
                      style={styles.suggestionItem}
                      onPress={async () => {
                        setNewCustomAddress(s.description);
                        setAddressSuggestions([]);
                        // Resolve coordinates from the selected place
                        const details = await getPlaceDetails(s.placeId);
                        if (details?.geometry?.location) {
                          setSelectedCoords(details.geometry.location);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={s.description}
                    >
                      <Ionicons
                        name="location"
                        size={13}
                        color={THEME.accent}
                        style={styles.suggestionIconWrap}
                      />
                      <View style={modalStyles.flex1}>
                        <Text style={styles.suggestionMain}>{s.mainText}</Text>
                        {s.secondaryText ? (
                          <Text style={styles.suggestionSub}>{s.secondaryText}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={[modalStyles.inputWrap, styles.spotInputMarginTop8]}>
              <Ionicons name="chatbubble-outline" size={16} color={THEME.textSubtle} />
              <TextInput
                value={newCustomNotes}
                onChangeText={setNewCustomNotes}
                placeholder="Notes (optional)"
                accessibilityLabel="Notes for your custom spot"
                placeholderTextColor={THEME.textFaint}
                style={modalStyles.input}
                keyboardAppearance="dark"
                returnKeyType="next"
              />
            </View>
            <View style={[modalStyles.inputWrap, styles.spotInputMarginTop8]}>
              <Ionicons name="pricetag-outline" size={16} color={THEME.textSubtle} />
              <TextInput
                value={newCustomTags}
                onChangeText={setNewCustomTags}
                placeholder="Tags (e.g. pasta, homecooking, spicy)"
                accessibilityLabel="Tags for your custom spot, comma separated"
                placeholderTextColor={THEME.textFaint}
                style={modalStyles.input}
                keyboardAppearance="dark"
                returnKeyType="done"
              />
            </View>
            <View style={styles.spotsBtnRow}>
              <TouchableOpacity
                onPress={() => {
                  if (editingSpotId) {
                    // Dupe check (exclude the spot being edited)
                    const others = customPlaces.filter((cp) => cp.place_id !== editingSpotId);
                    const dupeMatch = findDupe(
                      newCustomName.trim(),
                      newCustomAddress.trim(),
                      others,
                    );
                    if (dupeMatch) {
                      setSpotsMsg({ type: 'error', text: dupeMessage(dupeMatch) });
                      return;
                    }
                    // Update existing spot
                    const updated = customPlaces.map((cp) =>
                      cp.place_id === editingSpotId
                        ? {
                            ...cp,
                            name: newCustomName.trim(),
                            vicinity: newCustomAddress.trim(),
                            notes: newCustomNotes.trim(),
                            tags: newCustomTags.trim(),
                            ...(selectedCoords
                              ? { lat: selectedCoords.lat, lng: selectedCoords.lng }
                              : {}),
                          }
                        : cp,
                    );
                    setCustomPlaces(updated);
                    safeStore(STORAGE_KEYS.CUSTOM_PLACES, updated);
                    setEditingSpotId(null);
                    setNewCustomName('');
                    setNewCustomAddress('');
                    setNewCustomNotes('');
                    setNewCustomTags('');
                    setAddressSuggestions([]);
                    setSpotsMsg({ type: 'success', text: 'Updated!' });
                    setTimeout(() => setSpotsMsg(null), ADDED_TOAST_MS);
                  } else {
                    const result = addCustomPlace(newCustomName, newCustomAddress, {
                      notes: newCustomNotes,
                      tags: newCustomTags,
                      lat: selectedCoords?.lat,
                      lng: selectedCoords?.lng,
                      currentCustom: customPlaces,
                      setCustom: setCustomPlaces,
                    });
                    if (result.ok) {
                      setNewCustomName('');
                      setNewCustomAddress('');
                      setNewCustomNotes('');
                      setNewCustomTags('');
                      setAddressSuggestions([]);
                      setSelectedCoords(null);
                      setSpotsMsg({ type: 'success', text: 'Added!' });
                      setTimeout(() => setSpotsMsg(null), ADDED_TOAST_MS);
                    } else if (result.dupe) {
                      setSpotsMsg({ type: 'error', text: dupeMessage(result) });
                    }
                  }
                }}
                disabled={!newCustomName.trim()}
                style={[styles.addBtn, !newCustomName.trim() && styles.opacity05]}
                accessibilityRole="button"
                accessibilityLabel={editingSpotId ? 'Update spot' : 'Add spot'}
              >
                <Ionicons
                  name={editingSpotId ? 'checkmark' : 'add'}
                  size={18}
                  color={THEME.white}
                />
                <Text style={styles.addBtnText}>{editingSpotId ? 'Update Spot' : 'Add Spot'}</Text>
              </TouchableOpacity>
              {editingSpotId && (
                <TouchableOpacity
                  onPress={() => {
                    setEditingSpotId(null);
                    setNewCustomName('');
                    setNewCustomAddress('');
                    setNewCustomNotes('');
                    setNewCustomTags('');
                    setAddressSuggestions([]);
                  }}
                  style={styles.cancelEditBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel editing"
                >
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {customPlaces.length > SPOTS_SEARCH_THRESHOLD && (
            <View style={[modalStyles.inputWrap, styles.spotsSearchWrap]}>
              <Ionicons name="search" size={14} color={THEME.textHalf} />
              <TextInput
                value={spotsSearch}
                onChangeText={setSpotsSearch}
                placeholder="Search your spots..."
                accessibilityLabel="Search your custom spots"
                placeholderTextColor={THEME.textHint}
                style={[modalStyles.input, styles.inputFontSize]}
                keyboardAppearance="dark"
                returnKeyType="done"
              />
            </View>
          )}
          <ScrollView
            style={styles.modalSpotsHeight}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {customPlaces
              .filter((cp) => {
                if (!spotsSearch.trim()) return true;
                const q = normalize(spotsSearch);
                return (
                  normalize(cp.name).includes(q) ||
                  normalize(cp.vicinity || '').includes(q) ||
                  normalize(cp.notes || '').includes(q) ||
                  normalize(cp.tags || '').includes(q)
                );
              })
              .map((cp) => (
                <TouchableOpacity
                  key={cp.place_id}
                  style={[
                    modalStyles.listItem,
                    editingSpotId === cp.place_id && styles.listItemEditing,
                  ]}
                  onPress={() => {
                    setEditingSpotId(cp.place_id);
                    setNewCustomName(cp.name);
                    setNewCustomAddress(cp.vicinity || '');
                    setNewCustomNotes(cp.notes || '');
                    setNewCustomTags(cp.tags || '');
                    setAddressSuggestions([]);
                    setSpotsMsg(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${cp.name}`}
                >
                  <View style={modalStyles.flex1}>
                    <Text style={modalStyles.listItemName}>{cp.name}</Text>
                    {cp.vicinity ? (
                      <Text style={modalStyles.listItemSub}>{cp.vicinity}</Text>
                    ) : null}
                    {cp.notes ? (
                      <Text style={[modalStyles.listItemSub, modalStyles.fontItalic]}>
                        {cp.notes}
                      </Text>
                    ) : null}
                    {cp.tags ? <Text style={styles.listItemTags}>{cp.tags}</Text> : null}
                    {(cp.lat === null || cp.lat === undefined) && (
                      <Text style={styles.missingCoordsHint}>
                        No Google-verified address; shows at any distance. Tap to edit and select
                        from suggestions
                      </Text>
                    )}
                  </View>
                  {cp.vicinity && (
                    <TouchableOpacity
                      onPress={() => openMapsSearchByText(cp.vicinity || cp.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.mapBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Directions to ${cp.name}`}
                    >
                      <Ionicons name="navigate-outline" size={16} color={THEME.pop} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      if (isConfirming(cp.place_id)) {
                        cancelConfirm();
                        removeCustomPlace(cp.place_id, customPlaces, setCustomPlaces);
                        if (editingSpotId === cp.place_id) {
                          setEditingSpotId(null);
                          setNewCustomName('');
                          setNewCustomAddress('');
                          setNewCustomNotes('');
                          setNewCustomTags('');
                        }
                        showToast(`Removed ${cp.name}.`, 'success', TOAST_SHORT);
                      } else {
                        startConfirm(cp.place_id);
                      }
                    }}
                    accessibilityLabel={
                      isConfirming(cp.place_id) ? `Confirm remove ${cp.name}` : `Remove ${cp.name}`
                    }
                    accessibilityRole="button"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.confirmTap}
                  >
                    {isConfirming(cp.place_id) ? (
                      <>
                        <Text style={styles.confirmText}>Tap to confirm</Text>
                        <Ionicons name="checkmark-circle" size={18} color={THEME.destructive} />
                      </>
                    ) : (
                      <Ionicons name="trash-outline" size={18} color={THEME.muted} />
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  listItemTags: { color: THEME.accent, fontSize: 13, marginTop: 3, fontWeight: '600' },
  missingCoordsHint: { color: THEME.textHint, fontSize: 11, marginTop: 3, fontStyle: 'italic' },
  listItemEditing: {
    borderColor: THEME.pop,
    borderWidth: 1,
    borderRadius: 10,
    borderBottomColor: THEME.pop,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  modalSpotsHeight: { maxHeight: INITIAL_SCREEN_HEIGHT * MODAL_SPOTS_RATIO },
  customForm: {
    marginVertical: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderDim,
  },
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
  opacity05: { opacity: 0.5 },
  spotsBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cancelEditBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  cancelEditText: { color: THEME.textHint, fontSize: 15, fontWeight: '600' },
  spotsMsg: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  addressFieldWrap: { marginTop: 8, zIndex: 10 },
  spotInputMarginTop8: { marginTop: 8 },
  suggestionsDropdown: {
    backgroundColor: THEME.surfaceDropdown,
    borderWidth: 1,
    borderColor: THEME.accentBorderLight,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    maxHeight: 180,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.surfaceLight,
  },
  suggestionMain: { color: THEME.cream, fontSize: 15, fontWeight: '700' },
  suggestionSub: { color: THEME.muted, fontSize: 13, marginTop: 1 },
  suggestionIconWrap: { marginRight: 8, marginTop: 2 },
  spotsSearchWrap: { marginTop: 10, marginBottom: 4 },
  inputFontSize: { fontSize: 14 },
  confirmTap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapBtn: {
    padding: 6,
    marginRight: 4,
  },
  confirmText: { color: THEME.destructive, fontSize: 11, fontWeight: '700' },
});

export { CustomPlacesModal };
export default CustomPlacesModal;
