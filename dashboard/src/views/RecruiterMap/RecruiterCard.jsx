import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RecruiterClassBadge } from './RecruiterClassBadge';

const STATUS_DOT = { ACTIVE: 'var(--heat-0)', FROZEN: 'var(--text-disabled)', INVESTIGATING: 'var(--heat-1)' };

export function RecruiterCard({ recruiter: r, isSelected, isFreezing, onSelect, onFreezeClick, index }) {
  const [hov, setHov] = useState(false);
  const isFrozen = r.status === 'FROZEN';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 30, delay: index * 0.06 }}
      whileHover={{ y: isFrozen ? 0 : -1 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onSelect}
      style={{
        background:  isSelected
          ? `color-mix(in srgb, var(--accent) 4%, var(--bg-surface))`
          : 'var(--bg-surface)',
        border:      isSelected ? '1px solid var(--accent)' : '1px solid var(--border-default)',
        borderLeft:  isSelected ? '3px solid var(--accent)' : '1px solid var(--border-default)',
        borderRadius:'12px',
        padding:     '16px',
        cursor:      'pointer',
        opacity:     isFrozen ? 0.6 : 1,
        filter:      isFrozen ? 'saturate(0.4)' : 'none',
        boxShadow:   hov && !isFrozen ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
        transition:  'box-shadow 0.15s ease, border-color 0.15s ease',
        display:     'flex',
        flexDirection:'column',
        gap:         '10px',
      }}
    >
      {/* Row 1: badge + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <RecruiterClassBadge classification={r.classification} size="sm" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_DOT[r.status] || 'var(--text-tertiary)' }} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            {r.status}
          </span>
        </div>
      </div>

      {/* Name + ID */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600,
          fontVariationSettings: "'opsz' 20, 'WONK' 0", color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {r.holderName}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
          {r.accountId}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border-default)' }} />

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
        {[
          { label: 'Downstream', value: r.downtreamCount,         color: 'var(--text-primary)', ff: 'var(--font-display)', fs: '22px', fw: 700 },
          { label: 'Active',     value: r.activeCount,            color: 'var(--heat-0)',        ff: 'var(--font-display)', fs: '18px', fw: 700 },
          { label: 'Frozen',     value: r.frozenCount,            color: 'var(--heat-4)',        ff: 'var(--font-display)', fs: '18px', fw: 700 },
          { label: 'Campaign',   value: `${r.campaignDurationHours}h`, color: 'var(--text-secondary)', ff: 'var(--font-mono)', fs: '11px', fw: 400 },
        ].map(stat => (
          <div key={stat.label}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)',
              marginBottom: '2px' }}>
              {stat.label}
            </div>
            <div style={{ fontFamily: stat.ff, fontSize: stat.fs, fontWeight: stat.fw,
              fontVariationSettings: stat.ff.includes('Fraunces') ? "'opsz' 28, 'WONK' 0" : undefined,
              color: stat.color, fontVariantNumeric: 'tabular-nums' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border-default)' }} />

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
        <button onClick={onSelect}
          style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500,
            color: 'var(--text-secondary)', background: 'var(--bg-subtle)',
            border: '1px solid var(--border-default)', borderRadius: '8px',
            padding: '6px 10px', cursor: 'pointer' }}>
          View Campaign →
        </button>

        {!isFrozen && (
          <button
            onClick={() => onFreezeClick(r)}
            disabled={isFreezing}
            style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500,
              color: 'var(--accent)', background: 'transparent',
              border: '1px solid var(--accent-border)', borderRadius: '8px',
              padding: '6px 10px', cursor: isFreezing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px',
              opacity: isFreezing ? 0.6 : 1 }}>
            {isFreezing ? '⟳' : '⏸'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
