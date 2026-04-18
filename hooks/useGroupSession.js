// useGroupSession — Fork Around (group fork) state and logic.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

import {
  BACKEND_URL,
  FETCH_TIMEOUT,
  GROUP_MODAL_CLOSE_DELAY,
  GROUP_POLL_INTERVAL,
  GROUP_SESSION_EXPIRED_STATUS,
  GROUP_RESULT_EXPIRY_MS,
} from '../constants/config';
import { STORAGE_KEYS } from '../constants/storage';
import { backendHeaders } from '../utils/api';
import { safeStore } from '../utils/helpers';

const HISTORY_MAX_GROUP = 50;

/**
 * Save a group fork result to local history.
 * @param {{name: string, vicinity?: string}} result
 * @param {string} sessionCode
 */
async function saveGroupToHistory(result, sessionCode) {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
  let all = [];
  try {
    all = raw ? JSON.parse(raw) : [];
  } catch (_) {
    // Corrupted history — reset
  }
  const item = {
    // eslint-disable-next-line no-magic-numbers -- base-36 for alphanumeric ID
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: result.name || 'Unknown',
    address: result.vicinity || '',
    type: 'group',
    session_code: sessionCode,
    forked_at: new Date().toISOString(),
  };
  all.unshift(item);
  const solo = all.filter((h) => h.type === 'solo');
  const group = all.filter((h) => h.type === 'group').slice(0, HISTORY_MAX_GROUP);
  await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([...solo, ...group]));
}

/**
 * Hook that manages Fork Around (group fork) sessions.
 * @param {object} opts
 * @param {() => Promise<{latitude: number, longitude: number}|null>} opts.ensureLocation - Get current location
 * @param {{latitude: number, longitude: number, label: string}|null} opts.customLocation - Custom search location
 * @param {(type: string) => boolean} opts.checkQuota - Check usage quota
 * @param {(type: string) => void} opts.incrementUsage - Increment usage counter
 * @param opts.onResult
 * @returns {object} Group session state and functions
 */
// eslint-disable-next-line max-lines-per-function -- group session hook managing create/join/poll/pick lifecycle
export default function useGroupSession({
  ensureLocation,
  customLocation,
  checkQuota,
  incrementUsage,
  onResult,
}) {
  // Keep onResult in a ref so polling closures always call the latest version
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupStep, setGroupStep] = useState('menu'); // menu | hosting | joining | waiting | result
  const [groupCode, setGroupCode] = useState('');
  const [groupHostId, setGroupHostId] = useState(null);
  const [groupParticipantId, setGroupParticipantId] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupJoinCode, setGroupJoinCode] = useState('');
  const [groupLocationName, setGroupLocationName] = useState('');
  const [groupHostName, setGroupHostName] = useState('');
  const [groupHostRadius, setGroupHostRadius] = useState(null);
  const [groupParticipants, setGroupParticipants] = useState([]);
  const [groupResult, setGroupResult] = useState(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState('');
  const [groupFiltersSubmitted, setGroupFiltersSubmitted] = useState(false);
  const [groupMeetUpTime, setGroupMeetUpTime] = useState(null);
  const groupPollRef = useRef(null);
  const groupPollFailCount = useRef(0);
  const [groupPollStale, setGroupPollStale] = useState(false);
  const resultExpiryRef = useRef(null);
  const [groupResultTime, setGroupResultTime] = useState(null);
  const prevReadyCountRef = useRef(0);
  const isHostRef = useRef(false);

  // ──── Polling ────

  function stopGroupPolling() {
    if (groupPollRef.current) {
      clearTimeout(groupPollRef.current);
      groupPollRef.current = null;
    }
  }

  /**
   * Poll the session status with exponential backoff on transient errors.
   * Transient: network failures, timeouts, 5xx responses — retry with backoff.
   * Permanent: 4xx responses (404 expired, 401/403 auth) — stop immediately.
   * @param {string} code - session code
   */
  // eslint-disable-next-line max-lines-per-function, sonarjs/cognitive-complexity -- polling with error classification and backoff
  function startGroupPolling(code) {
    stopGroupPolling();
    groupPollFailCount.current = 0;
    setGroupPollStale(false);
    const POLL_STALE_THRESHOLD = 3;
    const POLL_MAX_FAILURES = 15; // ~2 min at max backoff (16s × 8 + ramp-up)
    const POLL_TIMEOUT = 8000;
    const HTTP_CLIENT_ERROR_MIN = 400;
    const HTTP_SERVER_ERROR_MIN = 500;
    const HTTP_UNAUTHORIZED = 401;
    const HTTP_FORBIDDEN = 403;
    const BACKOFF_MAX = 16000;

    function scheduleNext() {
      const failCount = groupPollFailCount.current;
      // Exponential backoff: 2s → 4s → 8s → 16s max on failures
      const delay =
        failCount === 0
          ? GROUP_POLL_INTERVAL
          : Math.min(GROUP_POLL_INTERVAL * Math.pow(2, failCount), BACKOFF_MAX);
      groupPollRef.current = setTimeout(pollOnce, delay);
    }

    // eslint-disable-next-line sonarjs/cognitive-complexity -- error classification requires branching
    async function pollOnce() {
      const controller = new AbortController();
      const pollTimer = setTimeout(() => controller.abort(), POLL_TIMEOUT);
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/group/session?code=${encodeURIComponent(code)}`,
          { headers: backendHeaders(), signal: controller.signal },
        );
        clearTimeout(pollTimer);
        if (!response.ok) {
          // Permanent errors (4xx) — stop polling immediately
          if (response.status >= HTTP_CLIENT_ERROR_MIN && response.status < HTTP_SERVER_ERROR_MIN) {
            stopGroupPolling();
            if (response.status === GROUP_SESSION_EXPIRED_STATUS) {
              setGroupError('Session expired or ended by host.');
            } else if (
              response.status === HTTP_UNAUTHORIZED ||
              response.status === HTTP_FORBIDDEN
            ) {
              setGroupError('Session access denied. Please rejoin.');
            } else {
              setGroupError('Session is no longer available.');
            }
            setGroupStep('menu');
            return;
          }
          // Transient errors (5xx) — retry with backoff
          groupPollFailCount.current += 1;
          if (groupPollFailCount.current >= POLL_STALE_THRESHOLD) {
            setGroupPollStale(true);
          }
          if (groupPollFailCount.current >= POLL_MAX_FAILURES) {
            stopGroupPolling();
            setGroupError('Checking connection... Unable to reach server. Please rejoin.');
            setGroupStep('menu');
            return;
          }
          scheduleNext();
          return;
        }
        groupPollFailCount.current = 0;
        setGroupPollStale(false);
        const data = await response.json();
        const participants = data.participants || [];
        const readyCount = participants.filter((p) => p.ready).length;
        prevReadyCountRef.current = readyCount;
        setGroupParticipants(participants);
        if (data.meetUpTime) setGroupMeetUpTime(data.meetUpTime);
        if (data.status === 'done' && data.result) {
          stopGroupPolling();
          setGroupResult(data.result);
          setGroupResultTime(Date.now());
          // Save to local history
          saveGroupToHistory(data.result, code).catch(() => {});
          setGroupStep('result');
          if (onResultRef.current) {
            onResultRef.current({
              sessionCode: code,
              role: isHostRef.current ? 'host' : 'guest',
              participants: participants.length,
              resultName: data.result.name,
              resultAddress: data.result.vicinity || '',
              source: 'app',
            });
          }
          // Auto-clear result after 30 minutes
          if (resultExpiryRef.current) clearTimeout(resultExpiryRef.current);
          resultExpiryRef.current = setTimeout(() => {
            resetGroupState();
          }, GROUP_RESULT_EXPIRY_MS);
          return;
        }
        scheduleNext();
      } catch (err) {
        clearTimeout(pollTimer);
        groupPollFailCount.current += 1;
        if (groupPollFailCount.current >= POLL_STALE_THRESHOLD) {
          setGroupPollStale(true);
        }
        if (groupPollFailCount.current >= POLL_MAX_FAILURES) {
          stopGroupPolling();
          const msg =
            err.name === 'AbortError'
              ? 'Connection timed out. Please check your network and rejoin.'
              : 'Checking connection... Unable to reach server. Please rejoin.';
          setGroupError(msg);
          setGroupStep('menu');
          return;
        }
        scheduleNext();
      }
    }

    // Start first poll immediately
    groupPollRef.current = setTimeout(pollOnce, GROUP_POLL_INTERVAL);
  }

  // ──── State management ────

  function resetGroupState() {
    stopGroupPolling();
    if (resultExpiryRef.current) clearTimeout(resultExpiryRef.current);
    resultExpiryRef.current = null;
    prevReadyCountRef.current = 0;
    isHostRef.current = false;
    AsyncStorage.removeItem(STORAGE_KEYS.GROUP_SESSION).catch(() => {});
    setGroupStep('menu');
    setGroupCode('');
    setGroupHostId(null);
    setGroupParticipantId(null);
    setGroupName('');
    setGroupJoinCode('');
    setGroupLocationName('');
    setGroupHostName('');
    setGroupHostRadius(null);
    setGroupParticipants([]);
    setGroupResult(null);
    setGroupResultTime(null);
    setGroupLoading(false);
    setGroupError('');
    setGroupFiltersSubmitted(false);
    setGroupMeetUpTime(null);
  }

  /** Dismiss the group modal and clean up state. */
  function dismissGroupModal() {
    stopGroupPolling();
    setShowGroupModal(false);
    setTimeout(resetGroupState, GROUP_MODAL_CLOSE_DELAY);
  }

  /** Minimize the modal without ending the session (host keeps polling). */
  function minimizeGroupModal() {
    setShowGroupModal(false);
  }

  // ──── API helper ────

  /**
   * Helper to POST to group API endpoints.
   * @param {string} endpoint - e.g. 'create', 'join'
   * @param {object} body - request body
   * @returns {Promise<object>} parsed response
   */
  async function groupFetch(endpoint, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    // pick has its own serverless function; everything else goes through session.js
    const url =
      endpoint === 'pick' ? `${BACKEND_URL}/api/group/pick` : `${BACKEND_URL}/api/group/session`;
    const payload = endpoint === 'pick' ? body : { action: endpoint, ...body };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { ...backendHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `${endpoint} failed`);
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ──── Session actions ────

  /** End the session for real — leave/end + full cleanup. */
  function endGroupSession() {
    groupFetch('leave', { code: groupCode, participantId: groupParticipantId }).catch(() => {});
    dismissGroupModal();
  }

  /** Close the group modal, with context-aware behavior. */
  function closeGroupModal() {
    const keepAlive = groupStep === 'hosting' || groupStep === 'waiting' || groupStep === 'result';
    if (!keepAlive) {
      dismissGroupModal();
      return;
    }
    // Minimize — session/result stays accessible
    minimizeGroupModal();
  }

  /**
   * Host creates a new group session.
   * @param {object|null} overrideCoords - optional coordinates from location search
   * @returns {Promise<void>}
   */
  async function groupCreate(overrideCoords) {
    setGroupLoading(true);
    setGroupError('');
    let sessionCoords;
    if (overrideCoords?.latitude && overrideCoords?.longitude) {
      sessionCoords = { latitude: overrideCoords.latitude, longitude: overrideCoords.longitude };
    } else if (customLocation) {
      sessionCoords = { latitude: customLocation.latitude, longitude: customLocation.longitude };
    } else {
      sessionCoords = await ensureLocation().catch(() => null);
    }
    if (!sessionCoords) {
      setGroupError('Location is required to host. Search an address or enable GPS.');
      setGroupLoading(false);
      return;
    }
    try {
      const data = await groupFetch('create', {
        hostName: groupName.trim() || 'Host',
        latitude: sessionCoords.latitude,
        longitude: sessionCoords.longitude,
        locationName: groupLocationName.trim(),
        meetUpTime: groupMeetUpTime,
      });
      setGroupCode(data.code);
      setGroupHostId(data.hostId);
      isHostRef.current = true;
      setGroupParticipantId(data.hostId);
      setGroupStep('hosting');
      startGroupPolling(data.code);
      // Persist session so host can recover after app restart
      safeStore(STORAGE_KEYS.GROUP_SESSION, {
        code: data.code,
        hostId: data.hostId,
        hostName: groupName.trim() || 'Host',
      });
    } catch (_) {
      setGroupError('Could not create session. Try again.');
    } finally {
      setGroupLoading(false);
    }
  }

  /** Join an existing group session. @returns {Promise<void>} */
  async function groupJoin() {
    if (!groupName.trim()) {
      setGroupError('Enter your name first.');
      return;
    }
    if (groupJoinCode.trim().length !== 4) {
      setGroupError('Enter the 4-letter code from the host.');
      return;
    }
    setGroupLoading(true);
    setGroupError('');
    try {
      const data = await groupFetch('join', {
        code: groupJoinCode.trim().toUpperCase(),
        name: groupName.trim(),
        source: 'app',
        ref: 'app',
      });
      setGroupCode(data.code);
      setGroupParticipantId(data.participantId);
      if (data.locationName) setGroupLocationName(data.locationName);
      if (data.meetUpTime) setGroupMeetUpTime(data.meetUpTime);
      if (data.hostName) setGroupHostName(data.hostName);
      if (data.hostRadius) setGroupHostRadius(data.hostRadius);
      setGroupParticipants(data.participants || []);
      setGroupStep('waiting');
      startGroupPolling(data.code);
    } catch (e) {
      setGroupError(e.message || 'Could not join session.');
    } finally {
      setGroupLoading(false);
    }
  }

  /**
   * Submit filters to the group session.
   * @param {object} filters - Filter preferences from the group modal
   * @returns {Promise<void>}
   */
  async function groupSubmitFilters(filters) {
    setGroupLoading(true);
    setGroupError('');
    try {
      const data = await groupFetch('filters', {
        code: groupCode,
        participantId: groupParticipantId,
        name: groupName.trim() || undefined,
        filters: {
          radiusMiles: filters.radiusMiles,
          maxPrice: filters.maxPrice,
          minRating: filters.minRating,
          openNow: filters.openNow,
          hiddenGems: filters.hiddenGems,
          cuisineKeyword: (filters.cuisineKeyword || '').trim(),
          groupSize: filters.groupSize,
        },
      });
      setGroupParticipants(data.participants || []);
      setGroupFiltersSubmitted(true);
    } catch (_) {
      setGroupError('Could not submit filters. Try again.');
    } finally {
      setGroupLoading(false);
    }
  }

  /** Host triggers the group pick. */
  async function groupTriggerPick() {
    if (!checkQuota('group')) return;
    setGroupLoading(true);
    setGroupError('');
    try {
      const data = await groupFetch('pick', { code: groupCode, hostId: groupHostId });
      if (data.status === 'no_results') {
        setGroupError(data.message);
        setGroupLoading(false);
      } else {
        incrementUsage('group');
        // Safety timeout — if polling never delivers the result, exit loading
        setTimeout(() => {
          setGroupLoading((current) => {
            if (current) setGroupError('Pick is taking too long. Try again.');
            return false;
          });
        }, FETCH_TIMEOUT);
      }
      // Stay in loading state — result will arrive through polling
    } catch (e) {
      setGroupError(e.message || 'Pick failed. Try again.');
      setGroupLoading(false);
    }
  }

  /** Leave the current group session. */
  function groupLeave() {
    endGroupSession();
  }

  // ──── Session restore on mount ────

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.GROUP_SESSION);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!saved?.code || !saved?.hostId) return;
        // Verify session still exists on backend
        const res = await groupFetch('rejoin', {
          code: saved.code,
          hostId: saved.hostId,
        });
        // Session still alive — restore host state
        setGroupCode(res.code);
        setGroupHostId(saved.hostId);
        isHostRef.current = true;
        setGroupParticipantId(saved.hostId);
        setGroupName(saved.hostName || '');
        setGroupLocationName(res.locationName || '');
        if (res.meetUpTime) setGroupMeetUpTime(res.meetUpTime);
        setGroupHostName(res.hostName || '');
        if (res.participants) setGroupParticipants(res.participants);
        setGroupStep(res.status === 'done' ? 'result' : 'hosting');
        if (res.result) setGroupResult(res.result);
        startGroupPolling(res.code);
      } catch (_) {
        // Session expired or invalid — clear stale storage
        AsyncStorage.removeItem(STORAGE_KEYS.GROUP_SESSION).catch(() => {});
      }
    })();
    return () => stopGroupPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    showGroupModal,
    setShowGroupModal,
    groupStep,
    groupCode,
    groupName,
    setGroupName,
    groupJoinCode,
    setGroupJoinCode,
    groupLocationName,
    setGroupLocationName,
    groupHostName,
    groupHostRadius,
    groupParticipants,
    groupResult,
    groupLoading,
    groupError,
    groupFiltersSubmitted,
    groupEditFilters: () => setGroupFiltersSubmitted(false),
    groupMeetUpTime,
    setGroupMeetUpTime,
    groupResultTime,
    groupPollStale,
    groupHostId,
    resetGroupState,
    closeGroupModal,
    groupCreate,
    groupJoin,
    groupSubmitFilters,
    groupTriggerPick,
    groupLeave,
    checkQuota,
  };
}
