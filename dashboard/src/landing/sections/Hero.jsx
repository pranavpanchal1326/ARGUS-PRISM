import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { springSmooth, springSnappy } from '../../design/motion';
import useCountUp from '../../hooks/useCountUp';
import useScrolled from '../../hooks/useScrolled';
import { useDemoContext } from '../../demo/DemoContext';
import '../../design/landing-animations.css';

/* ─── Hero headline words ──────────────────────────────── */
const HEADLINE_WORDS = [
  { text: 'The',      accent: false },
  { text: 'mule',     accent: false },
  { text: 'network',  accent: false },
  { text: 'warms',    accent: false },
  { text: 'up',       accent: false },
  { text: '72',       accent: true  },
  { text: 'hours',    accent: true  },
  { text: 'before',   accent: false },
  { text: 'it',       accent: false },
  { text: 'strikes.', accent: false },
];

/* ─── Stats data ───────────────────────────────────────── */
const STATS = [
  { end: 36014, prefix: '₹',  suffix: ' Cr',   label: 'FY25 bank fraud value'      },
  { end: 72,    prefix: '',   suffix: ' hours', label: 'Pre-crime detection window' },
  { end: 60,    prefix: '<',  suffix: ' min',   label: 'AutoSTR generation time'    },
];

/* ─── Stat sub-component ───────────────────────────────── */
function StatItem({ end, prefix, suffix, label, delay }) {
  const { value, ref } = useCountUp(end, 1800);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSmooth, delay }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 var(--space-4)' }}
    >
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 700,
        fontVariationSettings: "'opsz' 48, 'WONK' 0", fontVariantNumeric: 'tabular-nums',
        color: 'var(--text-primary)', lineHeight: 1.1, display: 'block',
      }}>
        {prefix}{value.toLocaleString('en-IN')}{suffix}
      </span>
      <span style={{
        fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--text-tertiary)', marginTop: '4px', textAlign: 'center',
      }}>
        {label}
      </span>
    </motion.div>
  );
}

/**
 * Hero — fully wired CTAs:
 *   "View Live Demo"        → enterDemoMode() + navigate('/dashboard')
 *   "Read the Architecture" → href="#architecture" (smooth scroll)
 */
function Hero() {
  const scrolled          = useScrolled(80);
  const sectionRef        = useRef(null);
  const { enterDemoMode } = useDemoContext();
  const navigate          = useNavigate();

  const { scrollY } = useScroll();
  const glowY = useTransform(scrollY, [0, 600], [0, -80]);

  function handleDemoClick(e) {
    e.preventDefault();
    enterDemoMode();
    navigate('/dashboard');
  }

  return (
    <section id="hero" ref={sectionRef} style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '140px 24px 80px', position: 'relative', overflow: 'hidden',
    }}>

      {/* ── Ambient dot grid ─────────────────────────────── */}
      <div className="hero-grid-bg" aria-hidden="true" />

      {/* ── Parallax accent glow ─────────────────────────── */}
      <motion.div className="hero-glow" style={{ y: glowY }} aria-hidden="true" />

      {/* ── 1. Eyebrow badge ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...springSmooth, delay: 0.2 }}
        style={{ marginBottom: 'var(--space-6)', position: 'relative', zIndex: 1 }}
      >
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px', borderRadius: 'var(--radius-pill)',
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500,
          color: 'var(--text-secondary)',
          boxShadow: '0 2px 8px color-mix(in srgb, var(--text-primary) 6%, transparent)',
        }}>
          <span className="eyebrow-dot" style={{ color: 'var(--accent)', fontSize: '10px' }}>●</span>
          iDEA 2.0 · PS3 · Union Bank of India · ₹13 Lakh Prize Pool
        </span>
      </motion.div>

      {/* ── 2. H1 — word-by-word clip reveal ─────────────── */}
      <h1 style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(42px, 6vw, 76px)',
        fontWeight: 800, fontVariationSettings: "'opsz' 144, 'WONK' 1",
        lineHeight: 1.04, letterSpacing: '-0.03em', color: 'var(--text-primary)',
        maxWidth: '860px', marginBottom: 'var(--space-6)', position: 'relative', zIndex: 1,
      }}>
        {HEADLINE_WORDS.map((word, i) => (
          <span key={i} style={{ display: 'inline-block' }}>
            <span style={{ display: 'inline-block', overflow: 'hidden', lineHeight: 1.2, verticalAlign: 'bottom' }}>
              <motion.span
                style={{
                  display: 'inline-block',
                  color: word.accent ? 'var(--accent)' : 'inherit',
                  textShadow: word.accent
                    ? '0 0 40px color-mix(in srgb, var(--accent) 40%, transparent)'
                    : 'none',
                }}
                initial={{ y: '110%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 28, delay: 0.25 + i * 0.065 }}
              >
                {word.text}
              </motion.span>
            </span>
            {i < HEADLINE_WORDS.length - 1 ? ' ' : ''}
          </span>
        ))}
      </h1>

      {/* ── 3. Subheadline ───────────────────────────────── */}
      <motion.p
        style={{
          fontFamily: 'var(--font-ui)', fontSize: '17px', fontWeight: 400,
          lineHeight: 1.75, color: 'var(--text-secondary)', maxWidth: '540px',
          margin: '0 auto var(--space-8)', position: 'relative', zIndex: 1,
        }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSmooth, delay: 0.92 }}
      >
        PRISM detects the warming phase — six behavioural signals, 72 hours
        before illicit funds arrive — using KYC authority, not PMLA. By the
        time the money moves, the FIU report is already written.
      </motion.p>

      {/* ── 4. CTA row ───────────────────────────────────── */}
      <motion.div
        style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSmooth, delay: 1.05 }}
      >
        {/* PRIMARY — View Live Demo → enters demo mode */}
        <motion.a
          href="/dashboard"
          onClick={handleDemoClick}
          className="demo-btn-shimmer"
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={springSnappy}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'var(--accent)', color: 'var(--bg-base)',
            padding: '14px 28px', borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600,
            textDecoration: 'none', cursor: 'pointer',
            boxShadow: '0 4px 20px color-mix(in srgb, var(--accent) 35%, transparent)',
            transition: 'box-shadow 0.2s ease',
          }}
        >
          <span style={{ fontSize: '12px' }}>▶</span>
          View Live Demo
        </motion.a>

        {/* SECONDARY — Read Architecture → smooth scroll */}
        <motion.a
          href="#architecture"
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={springSnappy}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'transparent', color: 'var(--text-primary)',
            padding: '14px 28px', borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600,
            textDecoration: 'none', cursor: 'pointer',
            border: '1px solid var(--border-strong)',
            transition: 'border-color 0.2s ease, background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-subtle)';
            e.currentTarget.style.borderColor = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'var(--border-strong)';
          }}
        >
          Read the Architecture
          <span style={{ fontSize: '13px' }}>→</span>
        </motion.a>
      </motion.div>

      {/* ── Trust badges ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.5 }}
        style={{
          display: 'flex', gap: '24px', alignItems: 'center', justifyContent: 'center',
          marginTop: '20px', flexWrap: 'wrap', position: 'relative', zIndex: 1,
        }}
      >
        {['RBI KYC MD 2016', 'PMLA S.12', 'SC Writ 03/2025', 'FIU-IND XML'].map((badge, i) => (
          <span key={badge} style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 400,
            color: 'var(--text-tertiary)', letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            <span style={{ color: 'var(--success)', fontSize: '8px' }}>✓</span>
            {badge}
          </span>
        ))}
      </motion.div>

      {/* ── 5. Stats row ─────────────────────────────────── */}
      <motion.div
        style={{ width: '100%', maxWidth: '720px', marginTop: 'var(--space-12)', position: 'relative', zIndex: 1 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--border-default), transparent)',
          marginBottom: 'var(--space-6)',
        }} />
        <div style={{ display: 'flex', width: '100%' }}>
          {STATS.map((stat, i) => (
            <React.Fragment key={stat.label}>
              <StatItem {...stat} delay={1.3 + i * 0.12} />
              {i < STATS.length - 1 && (
                <div aria-hidden="true" style={{
                  width: '1px', height: '40px',
                  background: 'var(--border-default)', alignSelf: 'center', flexShrink: 0,
                }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </motion.div>

      {/* ── 6. Scroll indicator ──────────────────────────── */}
      <div
        className="scroll-indicator"
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: '32px', left: '50%',
          opacity: scrolled ? 0 : 1, transition: 'opacity 0.4s ease',
          animation: 'bounce-caret 1.8s ease-in-out infinite',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 6L8 11L13 6" stroke="var(--text-tertiary)" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

    </section>
  );
}

export default Hero;
