import { registerRootComponent } from 'expo';
import { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import App from './App';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>🍴</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>Please close and reopen the app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Hardcoded colors intentional — ErrorBoundary must not depend on THEME
/* eslint-disable react-native/no-color-literals */
const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    padding: 32,
  },
  errorEmoji: { fontSize: 48, marginBottom: 16 },
  errorTitle: { color: '#FB923C', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  errorText: { color: 'rgba(255,255,255,0.65)', fontSize: 14 },
});

function Root() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

registerRootComponent(Root);
