// useDeepLink — Handle incoming deep links for group session invites.

import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';

/** Regex for a valid 4-character session code (letters + digits). */
const SESSION_CODE_REGEX = /^[A-Z0-9]{4}$/;

/**
 * Extract a group session code from a URL.
 * Supports both custom scheme (`forkit://group?code=XXXX`) and
 * universal links (`https://forkit-web.vercel.app/group?code=XXXX`).
 * @param {string} url - The incoming URL
 * @returns {string|null} Uppercase 4-char session code, or null
 */
function extractGroupCode(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname || '';
    // Only handle /group paths (or forkit://group)
    if (!pathname.startsWith('/group') && parsed.host !== 'group') return null;
    const code = (parsed.searchParams.get('code') || '').trim().toUpperCase();
    if (SESSION_CODE_REGEX.test(code)) return code;
    return null;
  } catch (_) {
    return null;
  }
}

/**
 * Hook that listens for deep links and opens the group modal with a pre-filled code.
 * Handles both cold start (app not running) and warm start (app in background).
 * @param {object} opts
 * @param {Function} opts.setShowGroupModal - Show the group fork modal
 * @param {Function} opts.setGroupJoinCode - Pre-fill the join code
 * @param {Function} opts.resetGroupState - Reset group state before pre-filling
 */
export default function useDeepLink({ setShowGroupModal, setGroupJoinCode, resetGroupState }) {
  const handledInitialRef = useRef(false);

  useEffect(() => {
    /**
     * Process an incoming URL and open the group modal if it contains a valid code.
     * @param {string} url - The deep link URL
     */
    function handleUrl(url) {
      const code = extractGroupCode(url);
      if (!code) return;
      // Reset any existing group state before opening with a new code
      resetGroupState();
      setGroupJoinCode(code);
      setShowGroupModal(true);
    }

    // Cold start: check for initial URL that launched the app
    if (!handledInitialRef.current) {
      handledInitialRef.current = true;
      Linking.getInitialURL()
        .then((url) => {
          if (url) handleUrl(url);
        })
        .catch(() => {});
    }

    // Warm start: listen for URLs while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [setShowGroupModal, setGroupJoinCode, resetGroupState]);
}
