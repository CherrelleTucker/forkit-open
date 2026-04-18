// ForkIt — History modal (solo + group fork history)

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { SCROLL_THUMB_PERCENT, DAYS_PER_WEEK } from '../constants/config';
import modalStyles from '../constants/sharedStyles';
import { STORAGE_KEYS } from '../constants/storage';
import { THEME, MODAL_CONTENT_RATIO } from '../constants/theme';
import useInlineConfirm from '../hooks/useInlineConfirm';
import { openMapsSearchByText } from '../utils/helpers';

const FILTERS = ['All', 'Solo', 'Fork Around'];

/**
 * History modal — shows past fork results.
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onClose
 * @returns {JSX.Element}
 */
// eslint-disable-next-line max-lines-per-function -- modal with fetch, filter, and date formatting logic
function HistoryModal({ visible, onClose }) {
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const [filter, setFilter] = useState('All');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scrollRatio, setScrollRatio] = useState(0);
  const [scrollVisible, setScrollVisible] = useState(false);
  const { startConfirm, cancelConfirm, isConfirming } = useInlineConfirm();

  function handleClose() {
    cancelConfirm();
    onClose();
  }

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
        setHistory(raw ? JSON.parse(raw) : []);
      } catch (_) {
        setError('Could not load history.');
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const filtered = useMemo(
    () =>
      history.filter((item) => {
        if (filter === 'Solo') return item.type === 'solo';
        if (filter === 'Fork Around') return item.type === 'group';
        return true;
      }),
    [history, filter],
  );

  function formatDate(iso) {
    const MS_PER_DAY = 86400000; // eslint-disable-line no-magic-numbers -- 24*60*60*1000
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / MS_PER_DAY);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < DAYS_PER_WEEK) return `${diffDays} days ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
          onPress={handleClose}
          accessibilityLabel="Close history"
          accessibilityRole="button"
        />
        <View style={styles.card} accessibilityRole="none">
          <TouchableOpacity
            style={modalStyles.infoClose}
            onPress={handleClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={22} color={THEME.textIcon} />
          </TouchableOpacity>

          <Text style={styles.heading} accessibilityRole="header">
            Fork History
          </Text>

          {/* Filter pills */}
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, filter === f && styles.filterPillActive]}
                onPress={() => setFilter(f)}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === f }}
                accessibilityLabel={`Filter by ${f}`}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.listRow, { maxHeight: SCREEN_HEIGHT * MODAL_CONTENT_RATIO - 100 }]}>
            <ScrollView
              style={modalStyles.flex1}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={(w, h) =>
                setScrollVisible(h > SCREEN_HEIGHT * MODAL_CONTENT_RATIO - 100)
              }
              onScroll={({ nativeEvent }) => {
                const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
                const maxScroll = contentSize.height - layoutMeasurement.height;
                setScrollRatio(maxScroll > 0 ? contentOffset.y / maxScroll : 0);
              }}
              scrollEventThrottle={16}
            >
              {loading && (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color={THEME.accent} />
                </View>
              )}

              {!loading && !!error && <Text style={styles.emptyText}>{error}</Text>}

              {!loading && !error && filtered.length === 0 && (
                <Text style={styles.emptyText}>
                  {history.length === 0
                    ? 'No history yet. Start forking!'
                    : 'No results for this filter.'}
                </Text>
              )}

              {!loading && filtered.length > 0 && (
                <TouchableOpacity
                  style={styles.clearAllBtn}
                  onPress={() => {
                    if (isConfirming('__clear__')) {
                      cancelConfirm();
                      let updated;
                      if (filter === 'All') {
                        updated = [];
                      } else {
                        const typeKey = filter === 'Solo' ? 'solo' : 'group';
                        updated = history.filter((h) => h.type !== typeKey);
                      }
                      setHistory(updated);
                      AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated)).catch(
                        () => {},
                      );
                    } else {
                      startConfirm('__clear__');
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear history"
                >
                  {isConfirming('__clear__') ? (
                    <>
                      <Ionicons name="checkmark" size={13} color={THEME.destructive} />
                      <Text style={styles.clearConfirmText}>Tap to confirm</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={13} color={THEME.textMuted} />
                      <Text style={styles.clearAllText}>
                        Clear {filter === 'All' ? 'All' : filter}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {!loading &&
                filtered.map((item) => (
                  <View key={item.id} style={styles.historyItem}>
                    <View style={styles.historyIcon}>
                      <Ionicons
                        name={item.type === 'group' ? 'people' : 'restaurant'}
                        size={16}
                        color={item.type === 'group' ? THEME.pop : THEME.accent}
                      />
                    </View>
                    <View style={styles.historyContent}>
                      <Text style={styles.historyName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.historyMeta} numberOfLines={1}>
                        {formatDate(item.forked_at)}
                        {item.type === 'group' && item.session_code
                          ? ` \u00B7 ${item.session_code}`
                          : ''}
                        {item.address ? ` \u00B7 ${item.address}` : ''}
                      </Text>
                    </View>
                    {(item.address || item.name) && (
                      <TouchableOpacity
                        onPress={() => openMapsSearchByText(item.address || item.name)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.mapBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Directions to ${item.name}`}
                      >
                        <Ionicons name="navigate-outline" size={16} color={THEME.pop} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        if (isConfirming(item.id)) {
                          cancelConfirm();
                          const updated = history.filter((h) => h.id !== item.id);
                          setHistory(updated);
                          AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated)).catch(
                            () => {},
                          );
                        } else {
                          startConfirm(item.id);
                        }
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isConfirming(item.id)
                          ? `Confirm delete ${item.name}`
                          : `Delete ${item.name} from history`
                      }
                      style={styles.confirmTap}
                    >
                      {isConfirming(item.id) ? (
                        <>
                          <Text style={styles.confirmText}>Tap to confirm</Text>
                          <Ionicons name="checkmark-circle" size={16} color={THEME.destructive} />
                        </>
                      ) : (
                        <Ionicons name="close" size={16} color={THEME.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>
                ))}

              {!loading && history.length > 0 && (
                <Text style={styles.limitNote}>Keeps your last 50 solo and 50 group forks.</Text>
              )}
            </ScrollView>
            {scrollVisible && (
              <View style={styles.scrollTrack}>
                <View
                  style={[styles.scrollThumb, { top: `${scrollRatio * SCROLL_THUMB_PERCENT}%` }]}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.surfaceModal,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.borderGhost,
    padding: 16,
    marginHorizontal: 16,
    maxWidth: 380,
    width: '92%',
    shadowColor: THEME.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  heading: {
    color: THEME.accent,
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: THEME.surfaceLight,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: THEME.accentBg,
    borderColor: THEME.accentBorder,
  },
  filterText: {
    color: THEME.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextActive: {
    color: THEME.accent,
  },
  listRow: {
    flexDirection: 'row',
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: THEME.textMuted,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 30,
    fontStyle: 'italic',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingVertical: 6,
    marginBottom: 4,
  },
  clearAllText: {
    color: THEME.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  clearConfirmText: {
    color: THEME.destructive,
    fontSize: 12,
    fontWeight: '700',
  },
  confirmTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmText: {
    color: THEME.destructive,
    fontSize: 11,
    fontWeight: '700',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderDim,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyName: {
    color: THEME.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  limitNote: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 12,
    fontStyle: 'italic',
  },
  mapBtn: {
    padding: 6,
    marginRight: 4,
  },
  historyMeta: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollTrack: {
    width: 4,
    backgroundColor: THEME.borderDim,
    borderRadius: 2,
    marginLeft: 8,
  },
  scrollThumb: {
    position: 'absolute',
    width: 4,
    height: '30%',
    backgroundColor: THEME.popThumb,
    borderRadius: 2,
  },
});

export default HistoryModal;
