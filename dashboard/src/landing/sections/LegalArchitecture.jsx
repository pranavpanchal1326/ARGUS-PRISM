import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { springSmooth } from '../../design/motion';
import { WarmthBadge } from '../../components';
import '../../design/landing-animations.css';

/* ─── Legal rows data ─────────────────────────────────── */
const LEGAL_ROWS = [
  {
    range: '40 – 60', score: 50,
    basis: 'Internal Risk Policy', basisDetail: null,
    action: 'Enhanced monitoring — internal flag only. Zero customer impact.',
    noCourtOrder: false, isHighlighted: false,
  },
  {
    range: '60 – 75', score: 67,
    basis: 'RBI KYC Master Direction 2016', basisDetail: 'Section 38',
    action: 'KYC re-verification triggered. Branch call or Video KYC. No outbound restriction.',
    noCourtOrder: true, isHighlighted: false,
  },
  {
    range: '75 – 85', score: 80,
    basis: 'RBI KYC Master Direction 2016', basisDetail: 'Section 38',
    action: 'Outbound UPI restricted pending KYC. AutoSTR preparation initiated.',
    noCourtOrder: true, isHighlighted: false,
  },
  {
    range: '85 – 100', score: 92,
    basis: 'RBI KYC MD S.38 + PMLA S.12 + SC Writ 03/2025',
    basisDetail: 'Three simultaneous authorities',
    action: 'Full account restriction. AutoSTR filed. CBI Evidence Package generated. MLRO escalation.',
    noCourtOrder: true, isHighlighted: true,
  },
];

const ANNOTATIONS = [
  {
    icon: '⚖',
    title: 'The PMLA Cage Escape',
    body: 'PMLA requires court authorisation to freeze accounts — a process that takes days. PRISM restricts accounts at WarmthScore 60–85 under KYC Master Direction authority — a completely separate legal framework. By the time illicit funds arrive, the restriction is already in place.',
  },
  {
    icon: '🏛',
    title: 'Supreme Court Mandate — Unimplemented Everywhere Else',
    body: 'SC Suo Moto Writ 03/2025 directed the CBI to lead digital arrest fraud investigation and called on banks to implement AI-based mule detection. The CBI Evidence Package at WarmthScore 85+ is the only implementation of this mandate in any bank in India.',
  },
];

/* ─── Responsive hook ─────────────────────────────────── */
function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < bp);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < bp);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [bp]);
  return mobile;
}

/* ─── LegalRow (desktop) ──────────────────────────────── */
function LegalRowDesktop({ row, index }) {
  const rowStyle = {
    display:       'flex',
    alignItems:    'flex-start',
    padding:       '20px 0',
    borderBottom:  '1px solid var(--border-default)',
    position:      'relative',
    ...(row.isHighlighted ? {
      borderLeft:    '3px solid var(--accent)',
      paddingLeft:   '20px',
      background:    'color-mix(in srgb, var(--accent) 4%, transparent)',
      borderRadius:  '0 8px 8px 0',
    } : {}),
  };
  return (
    <motion.div
      style={rowStyle}
      initial={{ opacity: 0, x: -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ ...springSmooth, delay: index * 0.1 }}
    >
      {/* Col 1 — Score range: 140px */}
      <div style={{ width: '140px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 500,
          fontVariationSettings: "'opsz' 24, 'WONK' 0",
          color: row.isHighlighted ? 'var(--accent)' : 'var(--text-primary)',
          marginBottom: '6px' }}>
          {row.range}
        </div>
        <WarmthBadge score={row.score} showDot={false} />
      </div>

      {/* Col 2 — Legal basis: 1fr */}
      <div style={{ flex: 1, paddingRight: '24px' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500,
          color: 'var(--text-primary)', lineHeight: 1.5 }}>
          {row.basis}
        </div>
        {row.basisDetail && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px',
            color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {row.basisDetail}
          </div>
        )}
      </div>

      {/* Col 3 — Action: 1fr */}
      <div style={{ flex: 1, paddingRight: '24px' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 400,
          color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {row.action}
        </div>
      </div>

      {/* Col 4 — No court order: 120px */}
      <div style={{ width: '120px', flexShrink: 0, textAlign: 'center' }}>
        {row.noCourtOrder ? (
          <>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: 700,
              color: 'var(--success)' }}>✓</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 400,
              color: 'var(--success)', opacity: 0.8 }}>No court order</div>
          </>
        ) : (
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: 400,
            color: 'var(--text-tertiary)' }}>—</div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── LegalRow (mobile card) ──────────────────────────── */
function LegalRowMobile({ row, index }) {
  return (
    <motion.div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderLeft: row.isHighlighted ? '3px solid var(--accent)' : '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '16px',
        background: row.isHighlighted
          ? 'color-mix(in srgb, var(--accent) 4%, var(--bg-surface))'
          : 'var(--bg-surface)',
      }}
      initial={{ opacity: 0, x: -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ ...springSmooth, delay: index * 0.1 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 500,
            fontVariationSettings: "'opsz' 24, 'WONK' 0",
            color: row.isHighlighted ? 'var(--accent)' : 'var(--text-primary)' }}>
            {row.range}
          </div>
          <div style={{ marginTop: '4px' }}><WarmthBadge score={row.score} showDot={false} /></div>
        </div>
        {row.noCourtOrder && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: 700, color: 'var(--success)' }}>✓</div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', color: 'var(--success)' }}>No court order</div>
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500,
        color: 'var(--text-primary)', marginBottom: '4px' }}>{row.basis}</div>
      {row.basisDetail && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
          {row.basisDetail}
        </div>
      )}
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {row.action}
      </div>
    </motion.div>
  );
}

/* ─── LegalArchitecture ───────────────────────────────── */
export default function LegalArchitecture() {
  const isMobile = useIsMobile(768);

  return (
    <section id="legal" style={{
      background: 'var(--bg-base)', padding: '96px 0 112px',
      borderBottom: '1px solid var(--border-default)',
    }}>
      {/* Anchor for #compliance footer link */}
      <span id="compliance" style={{ position: 'absolute', marginTop: '-80px' }} aria-hidden="true" />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 48px' }}>

        {/* Header */}
        <motion.div
          style={{ textAlign: 'center', marginBottom: '64px' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={springSmooth}
        >
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)',
            marginBottom: '16px' }}>
            LEGAL ARCHITECTURE
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 600,
            fontVariationSettings: "'opsz' 36, 'WONK' 0", color: 'var(--text-primary)',
            lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: '16px' }}>
            Three legal frameworks.{'\n'}Appropriate to each threat stage.
          </h2>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '15px', fontWeight: 400,
            fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.75,
            maxWidth: '560px', margin: '0 auto' }}>
            PRISM does not circumvent PMLA. It operates in a different legal domain
            until PMLA naturally applies.
          </p>
        </motion.div>

        {/* Table */}
        {!isMobile && (
          <>
            {/* Header row */}
            <div style={{ display: 'flex', padding: '0 0 12px',
              borderBottom: '1px solid var(--border-strong)' }}>
              {[
                { label: 'SCORE RANGE', width: '140px' },
                { label: 'LEGAL BASIS',    width: '1fr' },
                { label: 'ACTION',         width: '1fr' },
                { label: 'NO COURT ORDER', width: '120px', center: true },
              ].map(col => (
                <div key={col.label} style={{
                  width: col.width === '1fr' ? undefined : col.width,
                  flex: col.width === '1fr' ? 1 : undefined,
                  flexShrink: col.width !== '1fr' ? 0 : undefined,
                  fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                  textAlign: col.center ? 'center' : 'left',
                  paddingRight: col.width !== '120px' ? '24px' : 0,
                }}>
                  {col.label}
                </div>
              ))}
            </div>
            {LEGAL_ROWS.map((row, i) => (
              <LegalRowDesktop key={row.range} row={row} index={i} />
            ))}
          </>
        )}

        {isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {LEGAL_ROWS.map((row, i) => (
              <LegalRowMobile key={row.range} row={row} index={i} />
            ))}
          </div>
        )}

        {/* Annotation blocks */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: '24px', marginTop: '56px',
        }}>
          {ANNOTATIONS.map((ann, i) => (
            <motion.div
              key={ann.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ ...springSmooth, delay: i * 0.15 }}
              whileHover={{ y: -3 }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Icon ring */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0,
              }}>
                {ann.icon}
              </div>
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600,
                color: 'var(--text-primary)', lineHeight: 1.4,
              }}>
                {ann.title}
              </div>
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 400,
                color: 'var(--text-secondary)', lineHeight: 1.7,
              }}>
                {ann.body}
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
