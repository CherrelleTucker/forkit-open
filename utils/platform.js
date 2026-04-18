import * as Haptics from 'expo-haptics';
import { Alert, Platform } from 'react-native';

/**
 * Haptics wrapper — provides selectionAsync and notificationAsync. No-op on web.
 * @type {{selectionAsync: Function, notificationAsync: Function, NotificationFeedbackType: object}}
 */
export const haptics = {
  selectionAsync: async () => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
  },
  notificationAsync: async (type) => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(type);
    }
  },
  NotificationFeedbackType: Haptics.NotificationFeedbackType,
};

/**
 * Cross-platform alert — native Alert on mobile, window.alert/confirm on web.
 * For dialogs inside Modals (e.g. HistoryModal), use ConfirmDialog directly
 * to avoid iOS nested Modal issues.
 * @param {string} title - Alert title
 * @param {string} [message] - Alert body text
 * @param {Array<{text: string, onPress?: Function, style?: string}>} [buttons] - Action buttons
 */
export const showAlert = (title, message, buttons) => {
  if (Platform.OS === 'web') {
    if (buttons?.length) {
      const choice = window.confirm(message ? `${title}\n\n${message}` : title);
      const btn = choice ? buttons[buttons.length - 1] : buttons[0];
      if (btn?.onPress) btn.onPress();
    } else {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
