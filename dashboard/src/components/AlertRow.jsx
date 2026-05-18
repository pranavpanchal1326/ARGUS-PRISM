import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { slideUpDelayed } from '../design/motion';
import { AnimatedScore } from './AnimatedScore';
import { WarmthBadge, getScoreLevel } from './WarmthBadge';

/* Named export — used by parent AnimatePresence */
export const alertRowExit = { opacity: 0, x: 16, height: 0 };

export const AlertRow = memo(function AlertRow({
  /* New API — account object */
  account,
  /* Legacy API — individual props */
  accountId,
  accountName,
  score,
  primarySignal,
  timeAgo,
  /* Shared */
  index     = 0,
  onReview,
  onClick,
  className = '',
}) {
  /* Resolve either account object or individual props */
  const id        = account?.account_id ?? accountId ?? '';
  const name      = account?.name       ?? accountName ?? '';
  const wscore    = account?.warmth_score ?? score ?? 0;
  const signal    = account?.top_signal  ?? primarySignal ?? '';
  const ago       = account?.time_ago    ?? timeAgo ?? '';
  const isTainted = account?.is_tainted  ?? false;

  const { level } = getScoreLevel(wscore);
  const isImminent = level === 'imminent';
  const handleClick = onClick ?? onReview;

  const rowStyle = {
    position:      'relative',
    display:       'flex',
    alignItems:    'center',
    gap:           'var(--space-4)',
    padding:       'var(--space-4) var(--space-6)',
    background:    isImminent
      ? 'color-mix(in srgb, var(--accent) 4%, var(--bg-surface))'
      : 'var(--bg-surface)',
    borderBottom:  '1px solid var(--border-default)',
    cursor:        'pointer',
    overflow:      'hidden',
    transition:    'background 0.15s ease, transform 0.15s ease',
  };

  return (
    <motion.div
      className={`alert-row alert-row--${level} ${className}`.trim()}
      style={rowStyle}
      data-account-id={id}
      data-score={wscore}
      layout
      {...slideUpDelayed(index)}
      exit={alertRowExit}
      onClick={handleClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background  = 'var(--bg-subtle)';
        e.currentTarget.style.transform   = 'translateX(2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isImminent
          ? 'color-mix(in srgb, var(--accent) 4%, var(--bg-surface))'
          : 'var(--bg-surface)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick?.()}
      aria-label={`${name}, WarmthScore ${Math.round(wscore)}, ${level.toUpperCase()}, ${ago}`}
    >
      {/* IMMINENT pin stripe — 3px left accent bar */}
      {isImminent && (
        <div
          aria-hidden="true"
          style={{
            position:     'absolute',
            left:         0,
            top:          0,
            bottom:       0,
            width:        '3px',
            background:   'var(--accent)',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}

      {/* 1. Account info */}
      <div style={{ flexGrow: 1, overflow: 'hidden' }}>
        <div
          className="text-body-md"
          style={{ fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span className="text-mono-sm" style={{ color: 'var(--text-tertiary)' }}>
            {id}
          </span>
          {isTainted && (
            <span style={{
              color:         'var(--warning)',
              fontSize:      '9px',
              fontWeight:    700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              ● TAINTED
            </span>
          )}
        </div>
      </div>

      {/* 2. Score */}
      <div style={{ width: '72px', textAlign: 'right' }}>
        <AnimatedScore value={wscore} size="sm" showHeat animate={false} />
      </div>

      {/* 3. Badge */}
      <div style={{ width: '100px' }}>
        <WarmthBadge score={wscore} showDot />
      </div>

      {/* 4. Signal */}
      <div
        className="text-mono-sm"
        style={{
          flex:          1,
          maxWidth:      '220px',
          color:         'var(--text-secondary)',
          overflow:      'hidden',
          whiteSpace:    'nowrap',
          textOverflow:  'ellipsis',
        }}
        title={signal}
      >
        {signal || '—'}
      </div>

      {/* 5. Time */}
      <div
        className="text-mono-sm"
        style={{ width: '72px', textAlign: 'right', color: 'var(--text-tertiary)' }}
      >
        {ago}
      </div>

      {/* 6. Review action */}
      <div
        className="text-body-md"
        style={{ width: '80px', textAlign: 'right', fontWeight: 500, color: 'var(--text-secondary)', transition: 'color 0.15s ease' }}
        onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.color = 'var(--accent)'; }}
        onMouseLeave={(e) => { e.stopPropagation(); e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        Review →
      </div>
    </motion.div>
  );
});

AlertRow.displayName = 'AlertRow';

AlertRow.propTypes = {
  account:       PropTypes.shape({
    account_id:   PropTypes.string,
    name:         PropTypes.string,
    warmth_score: PropTypes.number,
    top_signal:   PropTypes.string,
    time_ago:     PropTypes.string,
    is_tainted:   PropTypes.bool,
  }),
  accountId:     PropTypes.string,
  accountName:   PropTypes.string,
  score:         PropTypes.number,
  primarySignal: PropTypes.string,
  timeAgo:       PropTypes.string,
  index:         PropTypes.number,
  onReview:      PropTypes.func,
  onClick:       PropTypes.func,
  className:     PropTypes.string,
};

export default AlertRow;
