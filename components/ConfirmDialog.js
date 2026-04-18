// ForkIt — ConfirmDialog component
// Dark-themed dialog that replaces native Alert.alert() for consistent branding.
// Controlled via the global dialogRef from utils/platform.js.

import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { THEME } from '../constants/theme';

/**
 * Themed confirmation dialog. Renders identically on iOS and Android.
 * Mount once in App.js and control via dialogRef.
 * @param {object} props
 * @param {boolean} props.visible
 * @param {string} props.title
 * @param {string} [props.message]
 * @param {Array<{text: string, onPress?: Function, style?: string}>} [props.buttons]
 * @param {() => void} props.onClose
 * @returns {JSX.Element}
 */
function ConfirmDialog({ visible, title, message, buttons, onClose }) {
  if (!visible) return null;

  // If no buttons provided, show a single OK button
  const resolvedButtons = buttons?.length ? buttons : [{ text: 'OK' }];

  // Separate cancel button from action buttons for layout
  const cancelBtn = resolvedButtons.find((b) => b.style === 'cancel');
  const actionBtns = resolvedButtons.filter((b) => b.style !== 'cancel');

  function handlePress(btn) {
    onClose();
    if (btn.onPress) btn.onPress();
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Dismiss dialog"
          accessibilityRole="button"
        />
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>

          {!!message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.buttonGroup}>
            {/* Action buttons first (destructive or primary) */}
            {actionBtns.map((btn) => (
              <TouchableOpacity
                key={btn.text}
                style={[styles.button, btn.style === 'destructive' && styles.destructiveButton]}
                onPress={() => handlePress(btn)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={btn.text}
              >
                <Text
                  style={[styles.buttonText, btn.style === 'destructive' && styles.destructiveText]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Cancel button last, de-emphasized */}
            {cancelBtn && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handlePress(cancelBtn)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={cancelBtn.text}
              >
                <Text style={styles.cancelText}>{cancelBtn.text}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: THEME.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: THEME.surfaceModal,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.borderGhost,
    padding: 24,
    maxWidth: 340,
    width: '88%',
    alignItems: 'center',
  },
  title: {
    color: THEME.accent,
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonGroup: {
    width: '100%',
    gap: 8,
  },
  button: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: THEME.surfaceLight,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    alignItems: 'center',
  },
  buttonText: {
    color: THEME.textPrimary,
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
  },
  destructiveButton: {
    borderColor: THEME.destructiveBorder,
    backgroundColor: THEME.destructiveBg,
  },
  destructiveText: {
    color: THEME.destructive,
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: THEME.textMuted,
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
});

export { ConfirmDialog };
export default ConfirmDialog;
