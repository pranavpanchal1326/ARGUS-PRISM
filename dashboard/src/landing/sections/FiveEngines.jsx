import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { springSmooth } from '../../design/motion';
import '../../design/landing-animations.css';

/* ─── Engine data ─────────────────────────────────────── */
const ENGINES = [
  {
    number: '01', tag: 'PS3 CORE', name: 'FlowGraph',
    tagline: 'Real-time fund movement graph. Every PS3 pattern covered.',
    description: 'Neo4j-powered directed graph processing every Finacle transaction event in under 100ms. Five pattern detectors run simultaneously: Layering, Round-Trip, Structuring, Dormant Activation, and Profile Mismatch. FlowGraph alone satisfies every explicit PS3 requirement.',
    chips: ['Layering Detection', 'Round-Trip', 'Structuring', 'Dormant Activation', 'Profile Mismatch'],
    chipColor: 'default', accentLeft: false,
  },
  {
    number: '02', tag: 'PRE-CRIME', name: 'WarmthScore',
    tagline: 'Six signals. 72 hours before illicit funds arrive.',
    description: 'XGBoost ensemble scoring six behavioural signals: Test Credit Pattern, Device Fingerprint IMEI cluster, Velocity Derivative convexity, Dormant Reactivation with device change, FRI Contradiction (anti-evasion), and SIM Swap Velocity via September 2025 DoT-FIU MOU. SHAP attribution at every score point.',
    chips: ['Signal 1–6', 'XGBoost Ensemble', 'SHAP Explainability', 'FRI Anti-Evasion', 'DoT DIP API'],
    chipColor: 'accent', accentLeft: true,
  },
  {
    number: '03', tag: 'EVIDENCE', name: 'AutoSTR v2',
    tagline: 'Three evidence packages. One API call. Under 60 minutes.',
    description: 'Generates FIU-IND XML (SAPTRN + SAPINP + SAPLEP + SAPPIT), CBI Evidence Package PDF (fulfilling Supreme Court Writ 03/2025), and RBI Regulatory Report. Manual STR preparation: 3–7 days. PRISM: under 60 minutes. The CBI package is the only implementation of the Supreme Court mandate in any bank in India.',
    chips: ['FIU-IND XML', 'CBI PDF Package', 'RBI Report', 'SC Writ 03/2025', '< 60 Minutes'],
    chipColor: 'default', accentLeft: false,
  },
  {
    number: '04', tag: 'MEMORY', name: 'Taint Engine',
    tagline: 'Persistent network memory. Mule networks cannot hide by waiting.',
    description: 'When FlowGraph confirms a mule account, Taint Engine back-traces 4 hops in both directions and assigns persistent Taint Scores to every connected account in Neo4j. A dormant account with Taint Score 80 that reactivates 18 months later starts WarmthScore at 80 — not zero. The detection window collapses from 72 hours to under 12.',
    chips: ['4-Hop Propagation', 'Persistent Neo4j Scores', 'Cross-Session Memory', '12hr Detection Window'],
    chipColor: 'default', accentLeft: false,
  },
  {
    number: '05', tag: 'NETWORK', name: 'Recruiter Map',
    tagline: 'Stop the factory manager. Not just the workers.',
    description: 'Every other system targets mule accounts — the employees. Recruiter Map identifies the coordinator account sending test payments to 5–40+ warming accounts simultaneously. One source account → 40 destinations in 48 hours is not a mule. It is the campaign operator. PRISM freezes the coordinator and all downstream accounts in a single event.',
    chips: ['Coordinator Detection', 'Campaign-Level Freeze', 'Network Topology', 'Industrial Orchestrator'],
    chipColor: 'default', accentLeft: false,
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

/* ─── EngineCard ──────────────────────────────────────── */
function EngineCard({ engine, index = 0 }) {

  const [hovered, setHovered] = useState(false);
  const isPRE = engine.number === '02';

  const tagStyle = isPRE
    ? { background: 'var(--accent)', color: 'var(--bg-base)' }
    : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' };

  const chipStyle = engine.chipColor === 'accent'
    ? { background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }
    : { background: 'var(--bg-subtle)', color: 'var(--text-tertiary)', border: '1px solid var(--border-default)' };

  return (
    <motion.div
      className="engine-card"
      initial={{ opacity: 0, y: 32, x: -8 }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ ...springSmooth, delay: (index ?? 0) * 0.1 }}
      style={{
        background:   hovered ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border:       '1px solid var(--border-default)',
        borderLeft:   (hovered || isPRE) ? '3px solid var(--accent)' : '3px solid transparent',
        borderRadius: '12px',
        padding:      '32px',
        boxShadow:    hovered
          ? isPRE
            ? `0 8px 32px color-mix(in srgb, var(--accent) 20%, transparent), var(--shadow-lg)`
            : 'var(--shadow-lg)'
          : 'none',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 400,
            color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
            ENGINE {engine.number}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600,
            fontVariationSettings: "'opsz' 28, 'WONK' 0", color: 'var(--text-primary)',
            marginTop: '4px', lineHeight: 1.1 }}>
            {engine.name}
          </div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 400,
            color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.6 }}>
            {engine.tagline}
          </div>
        </div>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '4px',
          padding: '4px 10px', whiteSpace: 'nowrap', flexShrink: 0, ...tagStyle }}>
          {engine.tag}
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border-default)', margin: '20px 0' }} />

      {/* Description */}
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 400,
        color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>
        {engine.description}
      </p>

      {/* Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '20px' }}>
        {engine.chips.map(chip => (
          <span key={chip} style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em', borderRadius: '4px',
            padding: '4px 10px', ...chipStyle }}>
            {chip}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── FiveEngines ─────────────────────────────────────── */
export default function FiveEngines() {
  const isMobile  = useIsMobile(768);
  const isTablet  = useIsMobile(1024);

  const gridStyle = isMobile || isTablet
    ? { display: 'flex', flexDirection: 'column', gap: '32px' }
    : { display: 'flex', alignItems: 'flex-start', gap: '80px' };

  const leftStyle = isMobile || isTablet
    ? { width: '100%', paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-6)' }
    : { width: '420px', flexShrink: 0, position: 'sticky', top: '80px',
        paddingTop: '96px', paddingBottom: '96px' };

  const rightStyle = isMobile || isTablet
    ? { display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '96px' }
    : { flex: 1, display: 'flex', flexDirection: 'column', gap: '32px',
        paddingTop: '96px', paddingBottom: '96px' };

  return (
    <section id="architecture" style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-default)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 48px' }}>
        <div style={gridStyle}>

          {/* Left sticky column */}
          <div style={leftStyle}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={springSmooth}
            >
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)',
                marginBottom: '16px' }}>
                THE FIVE ENGINES
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: 700,
                fontVariationSettings: "'opsz' 40, 'WONK' 0", color: 'var(--text-primary)',
                lineHeight: 1.15, marginBottom: '24px', letterSpacing: '-0.02em' }}>
                Five engines.{'\n'}Every gap covered.
              </h2>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '15px', fontWeight: 400,
                lineHeight: 1.75, color: 'var(--text-secondary)', marginBottom: '40px' }}>
                FlowGraph alone is a complete PS3 submission.
                The four engines that follow are differentiation —
                capabilities no existing system in India provides.
              </p>
              <span style={{
                display: 'inline-block',
                fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600,
                color: 'var(--success)',
                background: 'color-mix(in srgb, var(--success) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
                borderRadius: '999px', padding: '6px 14px',
              }}>
                ✓ All PS3 requirements covered
              </span>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 400,
                color: 'var(--text-tertiary)', marginTop: '8px' }}>
                Engines 2–5 are differentiation built on top.
              </div>
            </motion.div>
          </div>

          {/* Right scrolling column */}
          <div style={rightStyle}>
            {ENGINES.map((engine, i) => (
              <EngineCard key={engine.number} engine={engine} index={i} />
            ))}

          </div>

        </div>
      </div>
    </section>
  );
}
