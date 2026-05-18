import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { springSnappy } from '../design/motion';

export function getScoreLevel(score) {
  if (score >= 85) return { level: 'imminent', label: 'IMMINENT', heatVar: '--heat-4' };
  if (score >= 75) return { level: 'critical', label: 'CRITICAL', heatVar: '--heat-3' };
  if (score >= 60) return { level: 'hot',      label: 'HOT',      heatVar: '--heat-2' };
  if (score >= 40) return { level: 'warming',  label: 'WARMING',  heatVar: '--heat-1' };
  return                   { level: 'clean',   label: 'CLEAN',    heatVar: '--heat-0' };
}

export function WarmthBadge({ score, className = '', showDot = true }) {
  const { level, label, heatVar } = getScoreLevel(score);
  const shouldPulse = level === 'critical' || level === 'imminent';
  const heatColor   = `var(${heatVar})`;

  const badgeStyle = {
    display:       'inline-flex',
    alignItems:    'center',
    gap:           '6px',
    padding:       '3px 10px',
    borderRadius:  'var(--radius-sm)',
    background:    `color-mix(in srgb, ${heatColor} 12%, transparent)`,
    border:        `1px solid color-mix(in srgb, ${heatColor} 25%, transparent)`,
    color:         heatColor,
    fontFamily:    'var(--font-ui)',
    fontSize:      '10px',
    fontWeight:    700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    whiteSpace:    'nowrap',
    userSelect:    'none',
    lineHeight:    1,
  };

  const dotStyle = {
    width:           '6px',
    height:          '6px',
    borderRadius:    '50%',
    backgroundColor: heatColor,
    flexShrink:      0,
    animation:       shouldPulse
      ? 'prism-badge-pulse 2.4s ease-in-out infinite'
      : 'none',
  };

  return (
    <motion.span
      className={`warmth-badge warmth-badge--${level} ${className}`.trim()}
      style={badgeStyle}
      data-level={level}
      data-score={score}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springSnappy}
      aria-label={`Risk level: ${label}, score ${Math.round(score)}`}
    >
      {showDot && <span style={dotStyle} aria-hidden="true" />}
      {label}
    </motion.span>
  );
}

WarmthBadge.propTypes = {
  score:     PropTypes.number.isRequired,
  className: PropTypes.string,
  showDot:   PropTypes.bool,
};

export default WarmthBadge;
