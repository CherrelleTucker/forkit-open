// ForkIt — LocationSearchSection component

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { THEME } from '../constants/theme';

/**
 * Location search input with autocomplete suggestions.
 * @param {object} props
 * @param {object|null} [props.customLocation] - Active custom location with label
 * @param {boolean} props.showLocationSearch - Whether the search input is visible
 * @param {string} props.locationQuery - Current search input value
 * @param {Array} props.locationSuggestions - Autocomplete suggestion results
 * @param {Function} props.onQueryChange - Text input change handler
 * @param {Function} props.onSelectSuggestion - Suggestion selection handler
 * @param {Function} props.onCancel - Cancel/close search handler
 * @returns {React.JSX.Element}
 */
function LocationSearchSection({
  customLocation,
  showLocationSearch,
  locationQuery,
  locationSuggestions,
  onQueryChange,
  onSelectSuggestion,
  onCancel,
}) {
  if (!showLocationSearch && !customLocation) return null;
  if (customLocation) {
    return (
      <View style={styles.customLocationRow}>
        <View style={styles.customLocationPill}>
          <Ionicons name="location" size={13} color={THEME.pop} />
          <Text style={styles.customLocationText} numberOfLines={1}>
            Searching near {customLocation.label}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.locationFieldWrap}>
      <View style={styles.inputWrap}>
        <Ionicons name="location-outline" size={16} color={THEME.textSubtle} />
        <TextInput
          value={locationQuery}
          onChangeText={onQueryChange}
          placeholder="Search from a different location"
          placeholderTextColor={THEME.textFaint}
          style={styles.input}
          accessibilityLabel="Search near a different location"
          keyboardAppearance="dark"
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity
          onPress={onCancel}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Cancel location search"
        >
          <Ionicons name="close" size={16} color={THEME.textSubtle} />
        </TouchableOpacity>
      </View>
      {locationSuggestions.length > 0 && (
        <View style={styles.suggestionsDropdown}>
          {locationSuggestions.map((s) => (
            <TouchableOpacity
              key={s.placeId}
              style={styles.suggestionItem}
              onPress={() => onSelectSuggestion(s)}
              accessibilityRole="button"
              accessibilityLabel={s.description}
            >
              <Ionicons
                name="location"
                size={13}
                color={THEME.accent}
                style={styles.suggestionIconWrap}
              />
              <View style={styles.flex1}>
                <Text style={styles.suggestionMain}>{s.mainText}</Text>
                {s.secondaryText ? (
                  <Text style={styles.suggestionSub}>{s.secondaryText}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  locationFieldWrap: { zIndex: 10, marginTop: 10, marginBottom: 4 },
  customLocationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 6 },
  customLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: THEME.popBgMedium,
    borderWidth: 1,
    borderColor: THEME.popBorderMedium,
    maxWidth: '100%',
  },
  customLocationText: { color: THEME.pop, fontSize: 14, fontWeight: '900', flexShrink: 1 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.borderMedium,
    backgroundColor: THEME.surfaceInput,
  },
  input: { color: THEME.white, flex: 1, fontWeight: '800' },
  suggestionsDropdown: {
    backgroundColor: THEME.surfaceDropdown,
    borderWidth: 1,
    borderColor: THEME.accentBorderLight,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    maxHeight: 180,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.surfaceLight,
  },
  suggestionMain: { color: THEME.cream, fontSize: 15, fontWeight: '700' },
  suggestionSub: { color: THEME.muted, fontSize: 13, marginTop: 1 },
  suggestionIconWrap: { marginRight: 8, marginTop: 2 },
  flex1: { flex: 1 },
});

export { LocationSearchSection };
export default LocationSearchSection;
