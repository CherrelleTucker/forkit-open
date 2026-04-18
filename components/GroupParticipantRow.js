// ForkIt — GroupParticipantRow component

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { THEME } from '../constants/theme';

/**
 * Renders a single row in the participant list.
 * @param {object} props - Component props
 * @param {{ name: string, isHost: boolean, ready: boolean }} props.participant - Participant data
 * @returns {JSX.Element} The rendered participant row
 */
function GroupParticipantRow({ participant }) {
  const { name, isHost, ready } = participant;
  return (
    <View key={name} style={styles.groupParticipantRow}>
      <Ionicons
        name={isHost ? 'star' : 'person'}
        size={14}
        color={ready ? THEME.pop : THEME.textHint}
      />
      <Text style={styles.groupParticipantName}>{name}</Text>
      <Text style={[styles.groupParticipantStatus, { color: ready ? THEME.pop : THEME.textHint }]}>
        {ready ? 'Ready' : 'Joined'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  groupParticipantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderFaint,
  },
  groupParticipantName: {
    color: THEME.textBright,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  groupParticipantStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export { GroupParticipantRow };
export default GroupParticipantRow;
