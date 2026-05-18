import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { springSmooth, springSnappy } from '../../design/motion';
import '../../design/landing-animations.css';

const NAV_LINKS = [
  { label: 'Product Overview', href: '#product'      },
  { label: 'Architecture',     href: '#architecture'  },
  { label: 'Legal Framework',  href: '#legal'         },
  { label: 'PS3 Compliance',   href: '#compliance'    },
  { label: 'GitHub Repository', href: 'https://github.com/team-argus-prism', external: true },
  { label: 'Documentation',    href: '#architecture'  },
];

const TECH_TAGS = [
  'Apache Kafka', 'Apache Flink', 'Neo4j 5.x',
  'XGBoost', 'SHAP', 'FastAPI',
  'React 18', 'D3.js', 'Recharts',
  'PostgreSQL 16', 'Redis', 'ReportLab',
];

function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < bp);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < bp);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [bp]);
  return mobile;
}

function FooterLink({ href, label, external }) {
  return (
    <motion.a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      whileHover={{ x: 3 }}
      transition={springSnappy}
      style={{
        fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 400,
        color: 'var(--text-secondary)', textDecoration: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '4px',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
    >
      {label}
      {external && <span style={{ fontSize: '10px', opacity: 0.6 }}>↗</span>}
    </motion.a>
  );
}

function TechTag({ label }) {
  return (
    <motion.span
      whileHover={{ scale: 1.04, y: -1 }}
      transition={springSnappy}
      style={{
        background: 'var(--bg-subtle)', border: '1px solid var(--border-default)',
        borderRadius: '4px', padding: '4px 10px', fontFamily: 'var(--font-mono)',
        fontSize: '10px', fontWeight: 400, color: 'var(--text-secondary)',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.color = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
    >
      {label}
    </motion.span>
  );
}

export default function Footer() {
  const isMobile = useIsMobile(768);

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
    gap: isMobile ? '40px' : '48px',
    maxWidth: '1200px', margin: '0 auto',
    padding: isMobile ? '48px 24px' : '64px 48px',
  };

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6 }}
      style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-default)' }}
    >
      <div style={gridStyle}>

        {/* Column 1 — Brand */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...springSmooth, delay: 0 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
        >
          {/* Logo */}
          <motion.a
            href="#hero"
            whileHover={{ scale: 1.02 }}
            transition={springSnappy}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '16px' }}
          >
            <div style={{
              width: '28px', height: '28px', background: 'var(--text-primary)',
              borderRadius: '3px', position: 'relative', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', bottom: '4px', right: '4px',
                width: '10px', height: '10px',
                background: 'var(--accent)', borderRadius: '1px',
              }} />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700,
              fontVariationSettings: "'opsz' 24, 'WONK' 0",
              color: 'var(--text-primary)', letterSpacing: '0.04em',
            }}>
              PRISM
            </span>
          </motion.a>

          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 400,
            lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: '240px',
          }}>
            Pre-crime Intelligence System for Mule Detection
          </div>

          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 400,
            color: 'var(--text-tertiary)', marginTop: '8px',
          }}>
            Team ARGUS · iDEA 2.0 · PS3 · Union Bank of India
          </div>

          {/* Compliance badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '20px' }}>
            {['RBI KYC MD', 'PMLA S.12', 'SC Writ 03/2025'].map(b => (
              <span key={b} style={{
                fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 500,
                color: 'var(--success)', background: 'color-mix(in srgb, var(--success) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--success) 20%, transparent)',
                borderRadius: '3px', padding: '2px 6px', letterSpacing: '0.03em',
              }}>
                ✓ {b}
              </span>
            ))}
          </div>

          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 400,
            color: 'var(--text-tertiary)', marginTop: 'auto', paddingTop: '32px',
          }}>
            © March 2026 · Team ARGUS
          </div>
        </motion.div>

        {/* Column 2 — Navigation links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...springSmooth, delay: 0.12 }}
        >
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--text-tertiary)', marginBottom: '20px',
          }}>
            PRODUCT
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {NAV_LINKS.map(link => (
              <FooterLink key={link.label} {...link} />
            ))}
          </div>
        </motion.div>

        {/* Column 3 — Tech stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...springSmooth, delay: 0.24 }}
        >
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: '10px', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--text-tertiary)', marginBottom: '20px',
          }}>
            BUILT WITH
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TECH_TAGS.map(tag => (
              <TechTag key={tag} label={tag} />
            ))}
          </div>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 400,
            color: 'var(--text-tertiary)', marginTop: '20px', lineHeight: 1.6,
          }}>
            DoT DIP API · FIU-IND XML Schema · RBI KYC MD 2016
          </div>
        </motion.div>

      </div>

      {/* Divider + bottom row */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 24px 32px' : '0 48px 48px' }}>
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--border-default), transparent)',
          marginBottom: '24px',
        }} />
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : 0,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)' }}>
            ARGUS · Pre-crime Intelligence · March 2026
          </span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
            ₹36,014 Cr problem. One solution.
          </span>

          {/* Back to top */}
          <motion.a
            href="#hero"
            whileHover={{ y: -3, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={springSnappy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 500,
              color: 'var(--text-tertiary)', textDecoration: 'none', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            ↑ Back to top
          </motion.a>
        </div>
      </div>

    </motion.footer>
  );
}
