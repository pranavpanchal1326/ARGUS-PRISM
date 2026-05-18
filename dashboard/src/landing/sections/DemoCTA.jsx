import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { springSnappy, springSmooth } from '../../design/motion';
import { useDemoContext } from '../../demo/DemoContext';
import '../../design/landing-animations.css';

const FEATURE_BULLETS = [
  { icon: '⚡', label: '72-hour pre-crime detection window' },
  { icon: '📄', label: 'AutoSTR in under 60 minutes' },
  { icon: '🔍', label: 'Recruiter network mapping' },
  { icon: '⚖', label: 'KYC restriction — no court order needed' },
];

/**
 * DemoCTA — full-width vermilion call-to-action block.
 * Background is ALWAYS var(--accent) regardless of theme.
 */
export default function DemoCTA() {
  const [btnHovered, setBtnHovered] = useState(false);
  const { enterDemoMode } = useDemoContext();
  const navigate = useNavigate();

  function handleDemoClick(e) {
    e.preventDefault();
    enterDemoMode();
    navigate('/dashboard');
  }

  const fadeUp = (delay = 0) => ({
    initial:     { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport:    { once: true, margin: '-40px' },
    transition:  { ...springSmooth, delay },
  });

  return (
    <section
      id="demo"
      className="demo-cta-bg"
      style={{ width: '100%', padding: '120px 24px', position: 'relative', overflow: 'hidden' }}
    >
      {/* Ambient ring */}
      <div aria-hidden="true" style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '800px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Grid lines ambient */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>

        {/* Eyebrow */}
        <motion.div
          {...fadeUp(0)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '999px', padding: '5px 14px',
            fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.9)', marginBottom: '24px',
          }}
        >
          <span style={{ fontSize: '8px', opacity: 0.7 }}>●</span>
          Live Interactive Demo
        </motion.div>

        {/* Headline */}
        <motion.h2
          {...fadeUp(0.1)}
          style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 800, fontVariationSettings: "'opsz' 72, 'WONK' 0",
            lineHeight: 1.08, letterSpacing: '-0.025em',
            color: 'var(--bg-base)', margin: '0 0 20px',
          }}
        >
          By the time the money moves,
          <br />
          the FIU report is already written.
        </motion.h2>

        {/* Subtext */}
        <motion.p
          {...fadeUp(0.2)}
          style={{
            fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: 400,
            lineHeight: 1.75, color: 'rgba(255,255,255,0.75)',
            maxWidth: '520px', margin: '0 auto 36px',
          }}
        >
          PRISM detects the warming phase 72 hours before any illicit rupee arrives.
          MuleHunter.AI sees the account at hour 72. PRISM restricts it at hour 60.
        </motion.p>

        {/* Feature bullets */}
        <motion.div
          {...fadeUp(0.25)}
          style={{
            display: 'flex', flexWrap: 'wrap', gap: '10px 20px',
            justifyContent: 'center', marginBottom: '44px',
          }}
        >
          {FEATURE_BULLETS.map((f) => (
            <span key={f.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500,
              color: 'rgba(255,255,255,0.85)',
            }}>
              <span>{f.icon}</span>
              {f.label}
            </span>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          {...fadeUp(0.35)}
          style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}
        >
          {/* Primary */}
          <motion.a
            href="/dashboard"
            onClick={handleDemoClick}
            className="demo-btn-shimmer"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={springSnappy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: btnHovered ? '#fff' : 'var(--bg-base)',
              color: 'var(--accent)', padding: '16px 40px',
              borderRadius: '10px', fontFamily: 'var(--font-ui)',
              fontSize: '15px', fontWeight: 700, border: 'none',
              cursor: 'pointer', textDecoration: 'none', letterSpacing: '0.01em',
              boxShadow: btnHovered ? '0 16px 48px rgba(0,0,0,0.3)' : '0 6px 24px rgba(0,0,0,0.2)',
              transition: 'background 0.15s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
          >
            <span style={{ fontSize: '13px' }}>▶</span>
            View Live Demo
          </motion.a>

          {/* Secondary */}
          <motion.a
            href="#architecture"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={springSnappy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'transparent', color: 'rgba(255,255,255,0.9)',
              padding: '16px 32px', borderRadius: '10px',
              fontFamily: 'var(--font-ui)', fontSize: '15px', fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
              textDecoration: 'none', letterSpacing: '0.01em',
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)';
              e.currentTarget.style.background  = 'rgba(255,255,255,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.background  = 'transparent';
            }}
          >
            See Architecture →
          </motion.a>
        </motion.div>

        {/* Social proof line */}
        <motion.div
          {...fadeUp(0.45)}
          style={{
            marginTop: '32px',
            fontFamily: 'var(--font-mono)', fontSize: '10px',
            color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em',
          }}
        >
          iDEA 2.0 · PS3 · Union Bank of India · ₹13 Lakh Prize Pool
        </motion.div>

      </div>
    </section>
  );
}
