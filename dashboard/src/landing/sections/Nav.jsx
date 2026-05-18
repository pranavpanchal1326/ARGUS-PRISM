import React, { useState, useCallback, useRef } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { springSmooth, springSnappy } from '../../design/motion';
import { useTheme } from '../../hooks/useTheme';
import { ThemeToggle } from '../../components';

import '../../design/landing-animations.css';

const NAV_LINKS = [
  { label: 'Product',      href: '#product' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'Legal',        href: '#legal' },
  { label: 'Compliance',   href: '#compliance' },
];

/**
 * Nav — fixed top navigation bar with:
 *   - Glass morphism on scroll
 *   - Sliding underline on nav links (.nav-link::after)
 *   - Logo micro-animation on mount
 *   - Progress bar that fills as user scrolls the page
 */
function Nav() {
  const { theme, toggle }    = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const { scrollY, scrollYProgress } = useScroll();

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 80));
  useMotionValueEvent(scrollYProgress, 'change', (v) => setProgress(v));

  return (
    <>
      {/* ── Scroll progress bar ──────────────────────────── */}
      <motion.div
        aria-hidden="true"
        style={{
          position: 'fixed', top: 0, left: 0, height: '2px',
          background: 'var(--accent)', zIndex: 200,
          width: `${(progress * 100).toFixed(1)}%`,
          opacity: scrolled ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* ── Nav bar ─────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springSmooth, delay: 0.08 }}
        aria-label="Main navigation"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '60px',
          zIndex: 100, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 48px',
          background: scrolled
            ? 'color-mix(in srgb, var(--bg-base) 82%, transparent)'
            : 'transparent',
          borderBottom: scrolled
            ? '1px solid var(--border-default)'
            : '1px solid transparent',
          backdropFilter:       scrolled ? 'blur(16px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
          transition: 'background 0.35s ease, border-color 0.35s ease',
        }}
      >
        {/* Logo — micro-spring on mount */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springSnappy, delay: 0.15 }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}
        >
          <motion.svg
            width="26" height="26" viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
            whileHover={{ scale: 1.08, rotate: 3 }}
            transition={springSnappy}
          >
            <rect x="0" y="0" width="24" height="24" rx="3" fill="var(--text-primary)" />
            <rect x="13" y="13" width="7" height="7" rx="1" fill="var(--accent)" />
          </motion.svg>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700,
            fontVariationSettings: "'opsz' 24, 'WONK' 0",
            color: 'var(--text-primary)', letterSpacing: '-0.02em',
          }}>
            PRISM
          </span>
        </motion.div>

        {/* Nav links */}
        <nav className="nav-links" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {NAV_LINKS.map(({ label, href }, i) => (
            <motion.a
              key={href} href={href}
              className="nav-link"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSmooth, delay: 0.25 + i * 0.06 }}
              style={{
                fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500,
                color: 'var(--text-secondary)', textDecoration: 'none',
                padding: '6px 12px', borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
              whileHover={{ color: 'var(--text-primary)', background: 'var(--bg-subtle)' }}
              whileTap={{ scale: 0.97 }}
            >
              {label}
            </motion.a>
          ))}
        </nav>

        {/* Right */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springSmooth, delay: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}
        >
          <ThemeToggle theme={theme} toggle={toggle} />
          <motion.a
            href="#demo"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={springSnappy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'var(--accent)', color: 'var(--bg-base)',
              padding: '7px 16px', borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600,
              textDecoration: 'none', cursor: 'pointer', letterSpacing: '0.01em',
              boxShadow: '0 2px 12px color-mix(in srgb, var(--accent) 30%, transparent)',
            }}
          >
            Request Demo
          </motion.a>
        </motion.div>
      </motion.nav>
    </>
  );
}

export default Nav;
