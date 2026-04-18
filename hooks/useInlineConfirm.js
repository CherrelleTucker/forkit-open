// useInlineConfirm — two-tap inline delete confirmation.
// First tap enters confirm state (3s auto-dismiss). Second tap executes.

import { useCallback, useEffect, useRef, useState } from 'react';

const AUTO_DISMISS_MS = 3000;

/**
 * Hook for inline two-tap delete confirmation.
 * @returns {{ confirmingId: string|null, startConfirm: (id: string) => void, cancelConfirm: () => void, isConfirming: (id: string) => boolean }}
 */
export default function useInlineConfirm() {
  const [confirmingId, setConfirmingId] = useState(null);
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelConfirm = useCallback(() => {
    clearTimer();
    setConfirmingId(null);
  }, [clearTimer]);

  const startConfirm = useCallback(
    (id) => {
      clearTimer();
      setConfirmingId(id);
      timerRef.current = setTimeout(() => {
        setConfirmingId(null);
      }, AUTO_DISMISS_MS);
    },
    [clearTimer],
  );

  const isConfirming = useCallback((id) => confirmingId === id, [confirmingId]);

  // Cleanup on unmount
  useEffect(() => clearTimer, [clearTimer]);

  return { confirmingId, startConfirm, cancelConfirm, isConfirming };
}
