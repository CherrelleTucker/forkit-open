// ForkIt — BlockedModal component
// Modal for viewing and unblocking blocked restaurants.

import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TOAST_SHORT } from '../constants/config';
import modalStyles from '../constants/sharedStyles';
import { THEME, INITIAL_SCREEN_HEIGHT, MODAL_LIST_RATIO } from '../constants/theme';
import useInlineConfirm from '../hooks/useInlineConfirm';
import { unblockPlace } from '../utils/blocked';

/**
 * Blocked places modal.
 * @param {object} props
 * @param {boolean} props.visible - Whether the modal is shown
 * @param {() => void} props.onClose - Close the modal
 * @param {Array} props.blockedIds - Array of blocked place entries
 * @param {(blocked: Array) => void} props.setBlockedIds - Setter for blocked list
 * @param {(text: string, kind: string, ms: number) => void} props.showToast - Show a toast message
 * @returns {JSX.Element}
 */
function BlockedModal({ visible, onClose, blockedIds, setBlockedIds, showToast }) {
  const { startConfirm, cancelConfirm, isConfirming } = useInlineConfirm();

  function handleClose() {
    cancelConfirm();
    onClose();
  }

  const keyExtractor = useCallback((item) => item.place_id, []);

  const renderItem = useCallback(
    ({ item: b }) => (
      <View style={modalStyles.listItem}>
        <Text style={[modalStyles.listItemName, styles.blockedItemName]}>{b.name}</Text>
        <TouchableOpacity
          onPress={() => {
            if (isConfirming(b.place_id)) {
              unblockPlace(b.place_id, blockedIds, setBlockedIds);
              showToast(`Unblocked ${b.name}.`, 'success', TOAST_SHORT);
              cancelConfirm();
            } else {
              startConfirm(b.place_id);
            }
          }}
          accessibilityLabel={
            isConfirming(b.place_id) ? `Confirm unblock ${b.name}` : `Unblock ${b.name}`
          }
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.confirmTap}
        >
          {isConfirming(b.place_id) ? (
            <>
              <Text style={styles.confirmText}>Tap to confirm</Text>
              <Ionicons name="checkmark-circle" size={20} color={THEME.destructive} />
            </>
          ) : (
            <Ionicons name="close-circle-outline" size={20} color={THEME.muted} />
          )}
        </TouchableOpacity>
      </View>
    ),
    [blockedIds, setBlockedIds, showToast, isConfirming, startConfirm, cancelConfirm],
  );

  const emptyComponent = <Text style={modalStyles.infoText}>No blocked restaurants.</Text>;

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
          accessibilityLabel="Close blocked list"
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
            Blocked ({blockedIds.length})
          </Text>
          <FlatList
            data={blockedIds}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            style={styles.modalListHeight}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={emptyComponent}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blockedItemName: { flex: 1 },
  modalListHeight: { maxHeight: INITIAL_SCREEN_HEIGHT * MODAL_LIST_RATIO },
  confirmTap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confirmText: { color: THEME.destructive, fontSize: 11, fontWeight: '700' },
});

export { BlockedModal };
export default BlockedModal;
