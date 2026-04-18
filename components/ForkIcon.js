// ForkIt — ForkIcon SVG component

import { memo } from 'react';
import Svg, { Circle, Path, G } from 'react-native-svg';

import { THEME } from '../constants/theme';

/**
 * SVG fork icon with configurable size, color, and rotation.
 * @param {object} props
 * @param {number} [props.size=24] - Icon height in pixels
 * @param {string} [props.color] - Fill color (defaults to THEME.accent)
 * @param {string} [props.rotation='0deg'] - CSS rotation value
 * @returns {React.JSX.Element}
 */
function ForkIcon({ size = 24, color = THEME.accent, rotation = '0deg' }) {
  const width = size * (6 / 20);
  const height = size;
  return (
    <Svg
      width={width}
      height={height}
      viewBox="2.5 0 6 20"
      style={{ transform: [{ rotate: rotation }] }}
      accessibilityLabel="Fork icon"
      accessibilityRole="image"
    >
      {/* Fork rotated 180° so tines point down, scaled narrower at tines */}
      <G transform="rotate(180, 5.5, 8) translate(5.5, 0) scale(0.8, 1) translate(-5.5, 0)">
        <Path
          d="M4.25 0a.25.25 0 0 1 .25.25v5.122a.128.128 0 0 0 .256.006l.233-5.14A.25.25 0 0 1 5.24 0h.522a.25.25 0 0 1 .25.238l.233 5.14a.128.128 0 0 0 .256-.006V.25A.25.25 0 0 1 6.75 0h.29a.5.5 0 0 1 .498.458l.423 5.07a1.69 1.69 0 0 1-1.059 1.711l-.053.022a.92.92 0 0 0-.58.884L6.47 15a.971.971 0 1 1-1.942 0l.202-6.855a.92.92 0 0 0-.58-.884l-.053-.022a1.69 1.69 0 0 1-1.059-1.712L3.462.458A.5.5 0 0 1 3.96 0z"
          fill={color}
        />
      </G>
      {/* Teal pea below fork */}
      <Circle cx="5.5" cy="18" r="1.5" fill={THEME.pop} />
    </Svg>
  );
}

export { ForkIcon };
export default memo(ForkIcon);
