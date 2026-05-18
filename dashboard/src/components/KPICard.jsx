import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { springSmooth, springSnappy } from '../design/motion';
import { AnimatedScore } from './AnimatedScore';

const ACCENT_COLOR_MAP = {
  danger:  'var(--accent)',
  primary: 'var(--text-primary)',
  success: 'var(--success)',
};

const DELTA_CONFIG = {
  positive: { color: 'var(--success)', prefix: '↑ ' },
  negative: { color: 'var(--danger)',  prefix: '↓ ' },
  neutral:  { color: 'var(--text-tertiary)', prefix: '— ' },
};

export function KPICard({
  label,
  value,
  delta,
  deltaType    = 'neutral',
  /* New API */
  accentColor  = 'primary',
  /* Legacy alias */
  valueColour,
  animateValue = true,
  /* loading stripped — prevents spread as unknown DOM prop */
  loading,
  className    = '',
}) {
  /* Support both accentColor (new) and valueColour (legacy) */
  const resolvedAccent = valueColour ?? accentColor;
  const valueColor     = ACCENT_COLOR_MAP[resolvedAccent] ?? 'var(--text-primary)';
  const deltaConf      = DELTA_CONFIG[deltaType] ?? DELTA_CONFIG.neutral;

  const cardStyle = {
    display:        'flex',
    flexDirection:  'column',
    gap:            'var(--space-2)',
    padding:        'var(--space-6)',
    background:     'var(--bg-surface)',
    border:         '1px solid var(--border-default)',
    borderRadius:   'var(--radius-lg)',
    minWidth:       '180px',
  };

  const valueStyle = {
    fontFamily:            'var(--font-display)',
    fontSize:              '48px',
    fontWeight:            700,
    fontVariationSettings: "'opsz' 72, 'WONK' 0",
    fontVariantNumeric:    'tabular-nums',
    lineHeight:            1,
    color:                 valueColor,
  };

  const isNumeric = typeof value === 'number';

  return (
    <motion.div
      className={`kpi-card card-hover ${className}`.trim()}
      style={cardStyle}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSmooth}
      whileHover={{ y: -2 }}
    >
      {/* Label */}
      <span
        className="text-label-sm"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </span>

      {/* Value */}
      {isNumeric ? (
        <span style={{ color: valueColor }}>
          <AnimatedScore
            value={value}
            size="kpi"
            showHeat={false}
            animate={animateValue}
          />
        </span>
      ) : (
        <span style={valueStyle}>{value}</span>
      )}

      {/* Delta */}
      {delta ? (
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize:   '11px',
            fontWeight: 500,
            color:      deltaConf.color,
          }}
        >
          {deltaConf.prefix}{delta}
        </span>
      ) : null}
    </motion.div>
  );
}

KPICard.propTypes = {
  label:        PropTypes.string.isRequired,
  value:        PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  delta:        PropTypes.string,
  deltaType:    PropTypes.oneOf(['positive', 'negative', 'neutral']),
  accentColor:  PropTypes.oneOf(['danger', 'primary', 'success']),
  valueColour:  PropTypes.oneOf(['heat', 'success', 'danger', 'primary']),
  animateValue: PropTypes.bool,
  className:    PropTypes.string,
};

export default KPICard;
