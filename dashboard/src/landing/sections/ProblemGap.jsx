import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { springSmooth } from '../../design/motion';
import useFadeInView from '../../hooks/useFadeInView';
import '../../design/landing-animations.css';

const CARDS = [
  {
    id:          'fri',
    systemLabel: 'EXISTING SYSTEM 01',
    name:        'FRI',
    subtitle:    'Financial Risk Indicator',
    description: 'Classifies mobile numbers already reported as fraudulent. Clean SIMs bought specifically to avoid detection score LOW. By definition, it cannot flag what has never been reported.',
    gap:         'Clean SIMs bypass it entirely.',
    statusItems: [
      { label: 'Status',   value: 'LIVE — RBI Mandated June 2025', positive: true  },
      { label: 'Coverage', value: '23 banks integrated',            positive: true  },
      { label: 'Gap',      value: 'Clean SIM evasion',              positive: false },
    ],
    isPRISM: false,
  },
  {
    id:          'mulehunter',
    systemLabel: 'EXISTING SYSTEM 02',
    name:        'MuleHunter.AI',
    subtitle:    'NPCI Deployed ML Model',
    description: 'Detects mule accounts after illicit funds arrive. 19 static patterns trained on historical fraud. No warming phase detection. No taint memory. No recruiter mapping.',
    gap:         'Detects after the money moves.',
    statusItems: [
      { label: 'Status',   value: 'LIVE — 23 banks deployed',          positive: true  },
      { label: 'Patterns', value: '19 static (no real-time update)',    positive: false },
      { label: 'Gap',      value: 'Post-crime only',                    positive: false },
    ],
    isPRISM: false,
  },
  {
    id:          'prism',
    systemLabel: 'WHAT YOU ARE BUILDING',
    name:        'PRISM',
    subtitle:    'Pre-crime Intelligence System',
    description: 'Detects the warming phase 72 hours before illicit funds arrive. Six behavioural signals. Taint memory across confirmed networks. Recruiter node detection. AutoSTR in 60 minutes.',
    gap:         null,
    statusItems: [
      { label: 'Detection', value: '72 hours pre-crime',  positive: true },
      { label: 'Evidence',  value: 'AutoSTR < 60 minutes', positive: true },
      { label: 'Network',   value: 'Recruiter mapping',   positive: true },
    ],
    isPRISM: true,
  },
];

const CARD_DELAYS = [0, 0.12, 0.24];

/* ── Status item pill ───────────────────────────────────── */
function StatusPill({ value, positive }) {
  return (
    <span
      style={{
        padding:       '2px 8px',
        borderRadius:  'var(--radius-pill)',
        fontWeight:    600,
        fontSize:      '10px',
        letterSpacing: '0.04em',
        background:    positive
          ? 'color-mix(in srgb, var(--success) 12%, transparent)'
          : 'color-mix(in srgb, var(--danger) 12%, transparent)',
        color: positive ? 'var(--success)' : 'var(--danger)',
      }}
    >
      {value}
    </span>
  );
}

/* ── Individual gap card ────────────────────────────────── */
function GapCard({ card, delay }) {
  const { ref: inViewRef, isVisible } = useFadeInView({ threshold: 0.10 });
  const cardRef = useRef(null);

  /* Magnetic 3-D tilt via CSS custom properties */
  const handleMouseMove = useCallback((e) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const rx = ((e.clientY - top  - height / 2) / (height / 2)) * -6;
    const ry = ((e.clientX - left - width  / 2) / (width  / 2)) *  6;
    el.style.setProperty('--rx', `${rx}deg`);
    el.style.setProperty('--ry', `${ry}deg`);
  }, []);

  const handleMouseLeave = useCallback((e) => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  const cardStyle = {
    background:   card.isPRISM ? 'var(--bg-elevated)' : 'var(--bg-surface)',
    border:       '1px solid var(--border-default)',
    borderRadius: 'var(--radius-xl, var(--radius-lg))',
    padding:      'var(--space-8)',
    display:      'flex',
    flexDirection: 'column',
    gap:          'var(--space-4)',
    position:     'relative',
    overflow:     'hidden',
    boxShadow:    card.isPRISM ? 'var(--shadow-md)' : 'none',
    cursor:       'default',
  };

  return (
    <motion.div
      ref={(node) => { inViewRef.current = node; cardRef.current = node; }}
      className={`magnetic-card${card.isPRISM ? ' prism-card-visible' : ''}`}
      style={{
        background:   card.isPRISM ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border:       '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl, var(--radius-lg))',
        padding:      'var(--space-8)',
        display:      'flex',
        flexDirection: 'column',
        gap:          'var(--space-4)',
        position:     'relative',
        overflow:     'hidden',
        boxShadow:    card.isPRISM ? 'var(--shadow-lg)' : 'none',
        cursor:       'default',
        transformStyle: 'preserve-3d',
      }}
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 40, scale: isVisible ? 1 : 0.97 }}
      transition={{ ...springSmooth, delay }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* PRISM animated left accent stripe */}
      {card.isPRISM && (
        <motion.div
          aria-hidden="true"
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
            background: 'var(--accent)', transformOrigin: 'top',
          }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: isVisible ? 1 : 0 }}
          transition={{ duration: 0.6, delay: delay + 0.3, ease: [0.4, 0, 0.2, 1] }}
        />
      )}

      {/* System label */}
      <div
        style={{
          fontFamily:    'var(--font-ui)',
          fontSize:      '10px',
          fontWeight:    700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color:         card.isPRISM ? 'var(--accent)' : 'var(--text-tertiary)',
        }}
      >
        {card.systemLabel}
      </div>

      {/* System name */}
      <div
        style={{
          fontFamily:            'var(--font-display)',
          fontSize:              '28px',
          fontWeight:            700,
          fontVariationSettings: "'opsz' 36, 'WONK' 0",
          color:                 'var(--text-primary)',
          lineHeight:            1.1,
          marginBottom:          '2px',
        }}
      >
        {card.name}
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontFamily:   'var(--font-ui)',
          fontSize:     '12px',
          fontWeight:   500,
          color:        'var(--text-secondary)',
          marginBottom: 'var(--space-4)',
          marginTop:    '-var(--space-3)',
        }}
      >
        {card.subtitle}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border-default)', margin: 'var(--space-2) 0' }} />

      {/* Description */}
      <p
        style={{
          fontFamily:  'var(--font-ui)',
          fontSize:    '13px',
          fontWeight:  400,
          lineHeight:  1.65,
          color:       'var(--text-secondary)',
          flexGrow:    1,
          margin:      0,
        }}
      >
        {card.description}
      </p>

      {/* Gap statement — non-PRISM only */}
      {card.gap && (
        <div
          style={{
            marginTop:    'var(--space-4)',
            padding:      'var(--space-3) var(--space-4)',
            background:   'color-mix(in srgb, var(--danger) 10%, transparent)',
            border:       '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
            borderRadius: 'var(--radius-md)',
            fontFamily:   'var(--font-ui)',
            fontSize:     '12px',
            fontWeight:   600,
            color:        'var(--danger)',
          }}
        >
          ⚠ {card.gap}
        </div>
      )}

      {/* Status items */}
      <div
        style={{
          marginTop:     'var(--space-4)',
          display:       'flex',
          flexDirection: 'column',
          gap:           'var(--space-2)',
        }}
      >
        {card.statusItems.map(({ label, value, positive }) => (
          <div
            key={label}
            style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize:   '11px',
                fontWeight: 500,
                color:      'var(--text-tertiary)',
              }}
            >
              {label}
            </span>
            <StatusPill value={value} positive={positive} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Section heading wrapper ────────────────────────────── */
function SectionHead() {
  const { ref, inView } = useFadeInView();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 24 }}
      transition={springSmooth}
      style={{ textAlign: 'center' }}
    >
      <h2
        style={{
          fontFamily:            'var(--font-display)',
          fontSize:              '40px',
          fontWeight:            700,
          fontVariationSettings: "'opsz' 72, 'WONK' 0",
          lineHeight:            1.1,
          letterSpacing:         '-0.02em',
          color:                 'var(--text-primary)',
          marginBottom:          'var(--space-4)',
        }}
      >
        The gap that costs ₹36,014 crore a year
      </h2>
      <p
        style={{
          fontFamily:  'var(--font-ui)',
          fontSize:    '15px',
          fontWeight:  400,
          color:       'var(--text-secondary)',
          maxWidth:    '480px',
          margin:      '0 auto var(--space-12)',
        }}
      >
        Three systems. Two gaps. One window where fraud lives.
      </p>
    </motion.div>
  );
}

/* ── Closing italic quote ───────────────────────────────── */
function ClosingLine() {
  const { ref, inView } = useFadeInView({ threshold: 0.2 });
  return (
    <motion.p
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: inView ? 1 : 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      style={{
        fontFamily:            'var(--font-display)',
        fontStyle:             'italic',
        fontSize:              '18px',
        fontWeight:            400,
        fontVariationSettings: "'opsz' 24, 'WONK' 0",
        color:                 'var(--text-secondary)',
        textAlign:             'center',
        maxWidth:              '600px',
        margin:                'var(--space-8) auto 0',
        lineHeight:            1.6,
      }}
    >
      India's largest banks are reverting to branch verification because
      mule accounts broke digital onboarding. PRISM is the third option.
    </motion.p>
  );
}

/* ── ProblemGap section ─────────────────────────────────── */
function ProblemGap() {
  return (
    <section
      id="product"
      style={{
        maxWidth: '1200px',
        margin:   '0 auto',
        padding:  'var(--space-24) var(--space-12)',
      }}
    >
      <SectionHead />

      {/* Three-column card grid */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap:                 'var(--space-6)',
          alignItems:          'stretch',
        }}
        className="problem-gap-grid"
      >
        {CARDS.map((card, i) => (
          <GapCard key={card.id} card={card} delay={CARD_DELAYS[i]} />
        ))}
      </div>

      <ClosingLine />
    </section>
  );
}

export default ProblemGap;
