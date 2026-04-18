// Mock React Native modules for pure function testing
jest.mock('react-native', () => ({
  Linking: { openURL: jest.fn() },
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios' },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {},
}));
