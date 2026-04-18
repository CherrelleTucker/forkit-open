// useNetworkStatus — Track online/offline state using @react-native-community/netinfo.
// Requires: npx expo install @react-native-community/netinfo

import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/**
 * Hook that monitors network connectivity.
 * @returns {{ isConnected: boolean|null }}
 */
export default function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  return { isConnected };
}
