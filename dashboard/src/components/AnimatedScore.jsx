import React from 'react';
import PropTypes from 'prop-types';
import { animated } from '@react-spring/web';
import useSpringNumber from '../hooks/useSpringNumber';
import { getScoreLevel } from './WarmthBadge';

/* Maps both new ('lg','sm') and legacy ('hero','kpi','card','table') size props */
const SIZE_CONFIG = {
  lg:    { fontSize: '64px', fontWeight: 700, fontVariationSettings: "'opsz' 72, 'WONK' 0" },
  sm:    { fontSize: '28px', fontWeight: 600, fontVariationSettings: "'opsz' 32, 'WONK' 0" },
  hero:  { fontSize: '64px', fontWeight: 700, fontVariationSettings: "'opsz' 72, 'WONK' 0" },
  kpi:   { fontSize: '48px', fontWeight: 700, fontVariationSettings: "'opsz' 48, 'WONK' 0" },
  card:  { fontSize: '24px', fontWeight: 600, fontVariationSettings: "'opsz' 32, 'WONK' 0" },
  table: { fontSize: '20px', fontWeight: 600, fontVariationSettings: "'opsz' 24, 'WONK' 0" },
};

export function AnimatedScore({
  /* New API */
  value,
  showHeat    = true,
  /* Legacy API aliases */
  score,
  showDecimal = false,
  animate     = true,
  /* Shared */
  size        = 'lg',
  className   = '',
}) {
  /* Accept both `value` (new) and `score` (legacy) */
  const target = value ?? score ?? 0;

  /*
    Heat colour is derived from the TARGET value, not the spring value.
    This way the colour transitions independently of the count animation.
  */
  const { heatVar } = getScoreLevel(Math.round(target));
  const heatColor   = showHeat ? `var(${heatVar})` : 'var(--text-primary)';

  const { springValue } = useSpringNumber(animate !== false ? target : target);
  const sizeStyle = SIZE_CONFIG[size] ?? SIZE_CONFIG.lg;

  const containerStyle = {
    display:              'inline-block',
    fontFamily:           'var(--font-display)',
    fontVariantNumeric:   'tabular-nums',
    fontFeatureSettings:  '"tnum"',
    color:                heatColor,
    transition:           'color var(--transition-base)',
    lineHeight:           1,
    ...sizeStyle,
  };

  return (
    <span
      className={`animated-score animated-score--${size} ${className}`.trim()}
      style={containerStyle}
      aria-live="polite"
      aria-atomic="true"
      aria-label={`WarmthScore: ${Math.round(target)}`}
    >
      <animated.span>
        {springValue.to(n =>
          showDecimal ? n.toFixed(1) : Math.round(n).toString()
        )}
      </animated.span>
    </span>
  );
}

AnimatedScore.propTypes = {
  value:       PropTypes.number,
  score:       PropTypes.number,        /* legacy alias */
  size:        PropTypes.oneOf(['lg', 'sm', 'hero', 'kpi', 'card', 'table']),
  showHeat:    PropTypes.bool,
  showDecimal: PropTypes.bool,
  animate:     PropTypes.bool,
  className:   PropTypes.string,
};

export default AnimatedScore;
