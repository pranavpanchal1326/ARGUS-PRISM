import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';
import { springSmooth, springSnappy } from '../../design/motion';

/* ─── Data ───────────────────────────────────────────────── */
const MILESTONES = [
  {
    hour: 0, score: 21, label: 'ACCOUNT CREATED',
    title: 'A clean account. A fresh SIM. FRI sees nothing.',
    events: [
      { text: 'Account opened with Aadhaar-linked KYC', legal: null },
      { text: 'Mobile number scores LOW on FRI — zero fraud complaints', legal: null },
      { text: 'WarmthScore initialised at 21 — baseline established', legal: null },
    ],
    friIndicator: true,
  },
  {
    hour: 24, score: 41, label: 'WARMING DETECTED',
    title: 'Test credits begin. The recruiter is pipeline-testing.',
    events: [
      { text: 'Signal 1 fires — 4 micro-credits under ₹500 from dormant source accounts', legal: null },
      { text: 'Signal 2 fires — UPI registered on Device B, 3 IMEI prefix matches in fraud cluster', legal: null },
      { text: 'WarmthScore crosses 40 — internal WARMING flag set', legal: 'Internal risk policy — no customer impact' },
    ],
    friIndicator: false,
  },
  {
    hour: 48, score: 67, label: 'HOT — KYC TRIGGERED',
    title: 'Score crosses 60. KYC authority activated. No court order needed.',
    events: [
      { text: 'Signal 4 fires — dormant reactivation with new device detected', legal: null },
      { text: 'Signal 5 fires — FRI LOW contradicts WarmthScore HIGH — anti-evasion detector activates', legal: null },
      { text: 'KYC re-verification initiated — outbound UPI restricted at Hour 60', legal: 'RBI KYC Master Direction 2016 — Section 38' },
    ],
    friIndicator: false,
  },
  {
    hour: 72, score: 84, label: 'FUNDS BLOCKED',
    title: 'Illicit credit arrives. Account is already restricted. It cannot leave.',
    events: [
      { text: 'FlowGraph confirms layering pattern — ₹8,50,000 credit from unknown source', legal: null },
      { text: 'AutoSTR initiated — FIU-IND XML generation begins automatically', legal: 'PMLA Section 12 — 7-day mandate compressed to 60 minutes' },
      { text: 'CBI Evidence Package generated — Supreme Court Writ 03/2025 fulfilled', legal: 'SC Suo Moto Writ 03/2025 — first product in India to implement this' },
    ],
    friIndicator: false,
  },
];

const NODE_DELAYS = [0, 0.8, 1.6, 2.4]; /* seconds */
const POSITIONS   = ['0%', '33%', '66%', '100%'];

/* ─── Helpers ────────────────────────────────────────────── */
function getHeatColor(score) {
  if (score >= 85) return 'var(--heat-4)';
  if (score >= 75) return 'var(--heat-3)';
  if (score >= 60) return 'var(--heat-2)';
  if (score >= 40) return 'var(--heat-1)';
  return 'var(--heat-0)';
}

function nodeXTransform(i) {
  if (i === 0) return 'translateY(-50%)';
  if (i === 3) return 'translate(-100%, -50%)';
  return 'translate(-50%, -50%)';
}

/* ─── PulseRing ──────────────────────────────────────────── */
function PulseRing({ color, pulseKey }) {
  return (
    <motion.div
      key={pulseKey}
      style={{
        position: 'absolute', top: '50%', left: '50%',
        width: '24px', height: '24px', borderRadius: '50%',
        border: `2px solid ${color}`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
      initial={{ scale: 1, opacity: 0.8 }}
      animate={{ scale: 2.5, opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    />
  );
}

/* ─── ActiveScoreCounter ─────────────────────────────────── */
function ActiveScoreCounter({ score, color }) {
  const { num } = useSpring({
    from:   { num: 0 },
    num:    score,
    reset:  true,
    config: { mass: 1, tension: 120, friction: 20 },
  });
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: 'var(--space-4)' }}>
      <animated.span style={{
        fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 700,
        fontVariationSettings: "'opsz' 48, 'WONK' 0",
        fontVariantNumeric: 'tabular-nums', color, lineHeight: 1,
      }}>
        {num.to(n => Math.round(n))}
      </animated.span>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: 400, color: 'var(--text-tertiary)' }}>
        / 100
      </span>
    </div>
  );
}

/* ─── DetailCard ─────────────────────────────────────────── */
function DetailCard({ milestone }) {
  const color = getHeatColor(milestone.score);
  return (
    <motion.div
      key={milestone.hour}
      initial={{ opacity: 0, height: 0, y: -8 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: -8 }}
      transition={springSmooth}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 'var(--radius-lg)',
        padding: '24px 32px',
        marginTop: '48px',
        maxWidth: '680px',
        margin: '48px auto 0',
      }}>
        <ActiveScoreCounter key={milestone.score} score={milestone.score} color={color} />

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
          HOUR {milestone.hour}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600,
          fontVariationSettings: "'opsz' 24, 'WONK' 0", color: 'var(--text-primary)', marginBottom: '12px' }}>
          {milestone.title}
        </div>

        <div style={{ height: '1px', background: 'var(--border-default)', margin: '12px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {milestone.events.map((ev, i) => (
            <div key={i}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                ● {ev.text}
              </div>
              {ev.legal && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)',
                  marginLeft: '16px', marginTop: '2px' }}>
                  ↳ {ev.legal}
                </div>
              )}
            </div>
          ))}
        </div>

        {milestone.friIndicator && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 600,
              color: 'var(--heat-0)', background: 'color-mix(in srgb, var(--heat-0) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--heat-0) 25%, transparent)',
              padding: '2px 10px', borderRadius: 'var(--radius-pill)' }}>
              FRI Score: LOW
            </span>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontStyle: 'italic',
              color: 'var(--text-tertiary)', marginTop: '6px' }}>
              This number scores clean. PRISM will catch the contradiction at Hour 48.
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── MilestoneLabel ─────────────────────────────────────── */
function MilestoneLabel({ milestone, index, inView, isMobile }) {
  const isAbove = !isMobile && (index === 0 || index === 2);
  const delay   = NODE_DELAYS[index];
  const color   = getHeatColor(milestone.score);

  const posStyle = isMobile
    ? { marginLeft: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }
    : isAbove
      ? { position: 'absolute', bottom: 'calc(50% + 22px)', left: POSITIONS[index],
          transform: index === 0 ? 'translateX(0)' : index === 3 ? 'translateX(-100%)' : 'translateX(-50%)',
          textAlign: index === 0 ? 'left' : index === 3 ? 'right' : 'center' }
      : { position: 'absolute', top: 'calc(50% + 22px)', left: POSITIONS[index],
          transform: index === 0 ? 'translateX(0)' : index === 3 ? 'translateX(-100%)' : 'translateX(-50%)',
          textAlign: index === 0 ? 'left' : index === 3 ? 'right' : 'center' };

  return (
    <motion.div
      style={posStyle}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 8 }}
      transition={{ ...springSmooth, delay }}
    >
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700,
        fontVariationSettings: "'opsz' 24, 'WONK' 0", color, lineHeight: 1, marginBottom: '2px' }}>
        {milestone.score}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)',
        letterSpacing: '0.06em', marginBottom: '2px' }}>
        HOUR {milestone.hour}
      </div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)',
        whiteSpace: 'nowrap' }}>
        {milestone.label}
      </div>
    </motion.div>
  );
}

/* ─── MilestoneNode ──────────────────────────────────────── */
function MilestoneNode({ milestone, index, isSelected, onClick, inView, isMobile }) {
  const [pulseKey, setPulseKey] = useState(0);
  const color = getHeatColor(milestone.score);
  const delay = NODE_DELAYS[index];

  useEffect(() => {
    if (inView) {
      const t = setTimeout(() => setPulseKey(k => k + 1), delay * 1000 + 100);
      return () => clearTimeout(t);
    }
  }, [inView, delay]);

  const nodePos = isMobile
    ? { position: 'absolute', top: POSITIONS[index], left: '0', transform: 'translateY(-50%)' }
    : { position: 'absolute', top: '50%', left: POSITIONS[index], transform: nodeXTransform(index) };

  return (
    <motion.div
      style={{ ...nodePos, width: '24px', height: '24px', cursor: 'pointer', zIndex: 2 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: inView ? 1 : 0, opacity: inView ? 1 : 0 }}
      transition={{ ...springSnappy, delay }}
      onClick={onClick}
      onMouseEnter={() => setPulseKey(k => k + 1)}
    >
      {/* Node circle */}
      <div style={{
        width: '24px', height: '24px', borderRadius: '50%',
        background: color,
        border: '3px solid var(--bg-surface)',
        boxShadow: `0 0 0 1px ${color}`,
        position: 'relative',
      }} />
      <PulseRing color={color} pulseKey={pulseKey} />
    </motion.div>
  );
}

/* ─── HowItWorks ─────────────────────────────────────────── */
export default function HowItWorks() {
  const [selected, setSelected]   = useState(0);
  const [isMobile, setIsMobile]   = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const sectionRef                = useRef(null);
  const inView                    = useInView(sectionRef, { once: true, margin: '-80px' });

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const trackContainerStyle = isMobile
    ? { position: 'relative', paddingLeft: '40px', display: 'flex', flexDirection: 'column', gap: '64px' }
    : { position: 'relative', height: '120px' };

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      style={{
        width: '100%',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-default)',
        borderBottom: '1px solid var(--border-default)',
        padding: '96px 0',
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 var(--space-6)' }}>

        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 16 }}
            transition={{ ...springSmooth, delay: 0.1 }}
          >
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)',
              marginBottom: '16px' }}>
              HOW IT WORKS
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: 700,
              fontVariationSettings: "'opsz' 40, 'WONK' 0", color: 'var(--text-primary)',
              marginBottom: '16px', letterSpacing: '-0.02em' }}>
              72 hours. Six signals. One score.
            </h2>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: 400,
              lineHeight: 1.75, color: 'var(--text-secondary)', maxWidth: '520px',
              margin: '0 auto' }}>
              PRISM reads the warming phase before any illicit rupee arrives.
              By the time the mule account crosses threshold,
              the FIU report is already being written.
            </p>
          </motion.div>
        </div>

        {/* Timeline track */}
        <div style={trackContainerStyle}>

          {!isMobile && (
            <>
              {/* Ghost line */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: '50%',
                height: '2px', background: 'var(--border-default)',
                transform: 'translateY(-50%)', borderRadius: '1px' }} />
              {/* Fill line */}
              <motion.div style={{ position: 'absolute', left: 0, top: '50%',
                height: '2px', background: 'var(--accent)',
                transform: 'translateY(-50%)', borderRadius: '1px', transformOrigin: 'left' }}
                initial={{ width: '0%' }}
                animate={{ width: inView ? '100%' : '0%' }}
                transition={{ duration: 2.4, ease: [0.4, 0, 0.2, 1] }}
              />
            </>
          )}

          {isMobile && (
            <>
              {/* Vertical ghost line */}
              <div style={{ position: 'absolute', left: '11px', top: 0, bottom: 0,
                width: '2px', background: 'var(--border-default)', borderRadius: '1px' }} />
              {/* Vertical fill line */}
              <motion.div style={{ position: 'absolute', left: '11px', top: 0,
                width: '2px', background: 'var(--accent)', borderRadius: '1px', transformOrigin: 'top' }}
                initial={{ height: '0%' }}
                animate={{ height: inView ? '100%' : '0%' }}
                transition={{ duration: 2.4, ease: [0.4, 0, 0.2, 1] }}
              />
            </>
          )}

          {/* Nodes + labels */}
          {MILESTONES.map((m, i) => (
            isMobile ? (
              <div key={m.hour} style={{ display: 'flex', alignItems: 'center', position: 'relative', minHeight: '60px' }}>
                <MilestoneNode milestone={m} index={i} isSelected={selected === i}
                  onClick={() => setSelected(i)} inView={inView} isMobile />
                <MilestoneLabel milestone={m} index={i} inView={inView} isMobile />
              </div>
            ) : (
              <React.Fragment key={m.hour}>
                <MilestoneNode milestone={m} index={i} isSelected={selected === i}
                  onClick={() => setSelected(i)} inView={inView} isMobile={false} />
                <MilestoneLabel milestone={m} index={i} inView={inView} isMobile={false} />
              </React.Fragment>
            )
          ))}
        </div>

        {/* Detail card — AnimatePresence for smooth swap */}
        <AnimatePresence mode="wait">
          <DetailCard key={selected} milestone={MILESTONES[selected]} />
        </AnimatePresence>

        {/* Bottom annotation */}
        <motion.div
          style={{ textAlign: 'center', marginTop: '64px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: inView ? 1 : 0 }}
          transition={{ delay: 2.8, duration: 0.5 }}
        >
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 400,
            fontStyle: 'italic', color: 'var(--text-secondary)', maxWidth: '560px',
            margin: '0 auto', lineHeight: 1.75 }}>
            MuleHunter.AI would have seen this account at Hour 72 when the credit arrived.
            PRISM restricted it at Hour 60. The money could not move.
          </p>
          <div style={{ width: '80px', height: '1px', background: 'var(--border-default)',
            margin: '20px auto 0' }} />
        </motion.div>

      </div>
    </section>
  );
}
