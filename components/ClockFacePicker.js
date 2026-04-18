// ForkIt — ClockFacePicker component
// Branded analog clock face for time selection. Tap numbers to pick hour, then minutes.

import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { THEME } from '../constants/theme';

const CLOCK_SIZE = 256;
const CENTER = CLOCK_SIZE / 2;
const OUTER_RADIUS = 110;
const TICK_RADIUS = 88;
const HAND_LENGTH = 68;
const NUMBER_FONT_SIZE = 16;
const HALF_BTN = 21;
const SELECT_DOT = 42;
const CENTER_DOT_SIZE = 8;
const FULL_CIRCLE = 360;
const POSITIONS = 12;
const TOP_OFFSET = 90;
const DEG_PER_HOUR = 30;
const HALF_DAY = 12;
const HAND_WIDTH = 2;
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // eslint-disable-line no-magic-numbers -- clock positions
const MINUTE_VALUES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]; // eslint-disable-line no-magic-numbers -- clock minute positions

/**
 * Convert a clock position (0-11) to x,y coordinates on the circle.
 * @param {number} index - Position index (0 = 12 o'clock)
 * @param {number} radius - Distance from center
 * @returns {{x: number, y: number}}
 */
function positionAt(index, radius) {
  const angle = ((index * FULL_CIRCLE) / POSITIONS - TOP_OFFSET) * (Math.PI / 180);
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

/**
 * Branded clock face time picker.
 * @param {object} props
 * @param {number} props.hours - Selected hour (0-23)
 * @param {number} props.minutes - Selected minutes (0-59)
 * @param {(hours: number, minutes: number) => void} props.onChange - Called when selection changes
 * @returns {JSX.Element}
 */
// eslint-disable-next-line max-lines-per-function -- clock face with SVG rendering and tap handlers
function ClockFacePicker({ hours, minutes, onChange }) {
  const [mode, setMode] = useState('hour'); // 'hour' or 'minute'

  const display12 = hours % HALF_DAY || HALF_DAY;
  const isPM = hours >= HALF_DAY;

  const handAngle =
    mode === 'hour'
      ? ((display12 % HALF_DAY) * DEG_PER_HOUR - TOP_OFFSET) * (Math.PI / 180)
      : ((minutes / 5) * DEG_PER_HOUR - TOP_OFFSET) * (Math.PI / 180); // eslint-disable-line no-magic-numbers -- 5-min intervals

  const handX = CENTER + HAND_LENGTH * Math.cos(handAngle);
  const handY = CENTER + HAND_LENGTH * Math.sin(handAngle);

  const values = mode === 'hour' ? HOURS : MINUTE_VALUES;

  function handleTap(value) {
    if (mode === 'hour') {
      const newHour = isPM ? (value % HALF_DAY) + HALF_DAY : value % HALF_DAY;
      onChange(newHour, minutes);
      setMode('minute');
    } else {
      onChange(hours, value);
    }
  }

  function toggleAmPm() {
    onChange(isPM ? hours - HALF_DAY : hours + HALF_DAY, minutes);
  }

  function isSelected(value) {
    if (mode === 'hour') return value === display12;
    return value === minutes;
  }

  return (
    <View style={styles.container}>
      {/* Header showing selected time */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => setMode('hour')}
          accessibilityRole="button"
          accessibilityLabel={`Select hours, currently ${display12}`}
        >
          <Text style={[styles.headerDigit, mode === 'hour' && styles.headerDigitActive]}>
            {String(display12).padStart(2, '0')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerColon}>:</Text>
        <TouchableOpacity
          onPress={() => setMode('minute')}
          accessibilityRole="button"
          accessibilityLabel={`Select minutes, currently ${minutes}`}
        >
          <Text style={[styles.headerDigit, mode === 'minute' && styles.headerDigitActive]}>
            {String(minutes).padStart(2, '0')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleAmPm}
          style={styles.amPmBtn}
          accessibilityRole="button"
          accessibilityLabel={`Toggle AM PM, currently ${isPM ? 'PM' : 'AM'}`}
        >
          <Text style={[styles.amPmText, !isPM && styles.amPmTextActive]}>AM</Text>
          <Text style={[styles.amPmText, isPM && styles.amPmTextActive]}>PM</Text>
        </TouchableOpacity>
      </View>

      {/* Clock face */}
      <View style={styles.clockWrap}>
        <Svg width={CLOCK_SIZE} height={CLOCK_SIZE}>
          {/* Clock face — flat fill, no border */}
          <Circle cx={CENTER} cy={CENTER} r={OUTER_RADIUS} fill="rgba(255,255,255,0.06)" />
          {/* Center dot */}
          <Circle cx={CENTER} cy={CENTER} r={CENTER_DOT_SIZE} fill={THEME.pop} />
          {/* Clock hand */}
          <Line
            x1={CENTER}
            y1={CENTER}
            x2={handX}
            y2={handY}
            stroke={THEME.pop}
            strokeWidth={HAND_WIDTH}
            strokeLinecap="round"
          />
        </Svg>

        {/* Tappable numbers positioned absolutely over the SVG */}
        {values.map((value, index) => {
          const pos = positionAt(index, TICK_RADIUS);
          const selected = isSelected(value);
          const label = mode === 'minute' ? String(value).padStart(2, '0') : String(value);
          return (
            <TouchableOpacity
              key={`${mode}-${value}`}
              onPress={() => handleTap(value)}
              style={[
                styles.numberBtn,
                {
                  left: pos.x - HALF_BTN,
                  top: pos.y - HALF_BTN,
                },
                selected && styles.numberBtnSelected,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${mode === 'hour' ? "o'clock" : 'minutes'}`}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.numberText, selected && styles.numberTextSelected]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerDigit: {
    color: THEME.textMuted,
    fontSize: 28,
    fontFamily: 'Montserrat_700Bold',
    paddingHorizontal: 4,
  },
  headerDigitActive: {
    color: THEME.pop,
  },
  headerColon: {
    color: THEME.textMuted,
    fontSize: 26,
    fontFamily: 'Montserrat_700Bold',
    marginHorizontal: 2,
  },
  amPmBtn: {
    marginLeft: 12,
    backgroundColor: THEME.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: THEME.borderFaint,
  },
  amPmText: {
    color: THEME.textHint,
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    textAlign: 'center',
  },
  amPmTextActive: {
    color: THEME.pop,
  },
  clockWrap: {
    width: CLOCK_SIZE,
    height: CLOCK_SIZE,
    position: 'relative',
  },
  numberBtn: {
    position: 'absolute',
    width: SELECT_DOT,
    height: SELECT_DOT,
    borderRadius: SELECT_DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBtnSelected: {
    backgroundColor: THEME.pop,
  },
  numberText: {
    color: THEME.textNearWhite,
    fontSize: NUMBER_FONT_SIZE,
    fontFamily: 'Montserrat_600SemiBold',
  },
  numberTextSelected: {
    color: THEME.dark,
  },
});

export { ClockFacePicker };
export default ClockFacePicker;
