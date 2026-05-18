import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { ThemeToggle } from '../components';
import { useView } from './ViewContext';
import { useDemoContext } from '../demo/DemoContext';

const SERVICES = ['postgres', 'neo4j', 'redis', 'kafka', 'ml_model'];

/* ─── Hooks ──────────────────────────────────────────────── */

function useServiceHealth() {
  const [health, setHealth] = useState(null); /* null = loading */
  const [error,  setError]  = useState(false);

  useEffect(() => {
    async function ping() {
      try {
        const res = await fetch('/health');
        if (!res.ok) throw new Error('non-2xx');
        const data = await res.json();
        setHealth(data.services);
        setError(false);
      } catch {
        setError(true);
      }
    }
    ping();
    const id = setInterval(ping, 30_000);
    return () => clearInterval(id);
  }, []);

  return { health, error };
}

function useISTClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      /* Always produce IST regardless of local timezone */
      const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const h   = String(ist.getHours()).padStart(2, '0');
      const m   = String(ist.getMinutes()).padStart(2, '0');
      const s   = String(ist.getSeconds()).padStart(2, '0');
      setTime(`${h}:${m}:${s} IST`);
    }
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  return time;
}

/* ─── Sub-components ─────────────────────────────────────── */

function VerticalDivider({ mx = 16 }) {
  return (
    <div style={{
      width:       '1px',
      height:      '16px',
      background:  'var(--border-default)',
      margin:      `0 ${mx}px`,
      flexShrink:  0,
    }} />
  );
}

function HealthDot({ service, status, loading, error }) {
  let color;
  if (error)   color = 'var(--accent)';
  else if (loading) color = 'var(--heat-1)'; /* amber — checking */
  else color = status === 'ok' ? 'var(--success)' : 'var(--accent)';

  return (
    <div
      title={service}
      style={{
        width:        '8px',
        height:       '8px',
        borderRadius: '50%',
        background:   color,
        flexShrink:   0,
        transition:   'background 0.3s ease',
      }}
    />
  );
}

function LogoMark() {
  return (
    <div style={{
      width:        '28px',
      height:       '28px',
      background:   'var(--text-primary)',
      borderRadius: '3px',
      position:     'relative',
      flexShrink:   0,
    }}>
      <div style={{
        position:     'absolute',
        bottom:       '5px',
        right:        '5px',
        width:        '9px',
        height:       '9px',
        background:   'var(--accent)',
        borderRadius: '1px',
      }} />
    </div>
  );
}

/* ─── NavBar ─────────────────────────────────────────────── */

export default function NavBar() {
  const { theme, toggle }  = useTheme();
  const { activeView }     = useView();
  const { health, error }  = useServiceHealth();
  const clock              = useISTClock();
  const { isDemoMode }     = useDemoContext();
  const navigate           = useNavigate();
  const [logoHovered, setLogoHovered] = useState(false);

  const loading = health === null && !error;
  const topOffset = isDemoMode ? 36 : 0;

  return (
    <header style={{
      position:     'fixed',
      top:          topOffset,
      left:         0,
      right:        0,
      minHeight:    '56px',
      maxHeight:    '56px',
      zIndex:       100,
      background:   'var(--bg-surface)',
      borderBottom: '1px solid var(--border-default)',
      padding:      '0 24px',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'space-between',
      transition:   'top 0.2s ease',
    }}>

      {/* LEFT — Logo (back button) + Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center' }}>

        {/* PRISM logo — clicking navigates back to landing page */}
        <motion.button
          onClick={() => navigate('/')}
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          title="Back to landing page"
          aria-label="PRISM — back to landing page"
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '10px',
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            padding:    '4px 8px 4px 4px',
            borderRadius: '6px',
            outline:    'none',
            transition: 'background 0.15s ease',
            background: logoHovered ? 'var(--bg-subtle)' : 'transparent',
          }}
        >
          {/* ← back chevron — slides in on hover */}
          <span
            aria-hidden="true"
            style={{
              fontFamily:  'var(--font-ui)',
              fontSize:    '11px',
              color:       'var(--text-tertiary)',
              opacity:     logoHovered ? 1 : 0,
              transform:   logoHovered ? 'translateX(0)' : 'translateX(4px)',
              transition:  'opacity 0.18s ease, transform 0.18s ease',
              flexShrink:  0,
              lineHeight:  1,
            }}
          >
            ←
          </span>

          <LogoMark />

          <span style={{
            fontFamily:            'var(--font-display)',
            fontSize:              '15px',
            fontWeight:            700,
            fontVariationSettings: "'opsz' 20, 'WONK' 0",
            color:                 'var(--text-primary)',
            letterSpacing:         '0.05em',
          }}>
            PRISM
          </span>
        </motion.button>

        <VerticalDivider />

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 400,
            color: 'var(--text-tertiary)' }}>
            Dashboard
          </span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 400,
            color: 'var(--text-tertiary)', margin: '0 6px' }}>
            /
          </span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500,
            color: 'var(--text-primary)' }}>
            {activeView}
          </span>
        </div>
      </div>

      {/* RIGHT — Health + Clock + Theme */}
      <div style={{ display: 'flex', alignItems: 'center' }}>

        {/* SYSTEMS label */}
        <span style={{
          fontFamily:    'var(--font-ui)',
          fontSize:      '9px',
          fontWeight:    600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:         'var(--text-tertiary)',
          marginRight:   '10px',
        }}>
          SYSTEMS
        </span>

        {/* Health dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {SERVICES.map(svc => (
            <HealthDot
              key={svc}
              service={svc}
              status={health?.[svc]}
              loading={loading}
              error={error}
            />
          ))}
        </div>

        <VerticalDivider />

        {/* Live IST clock */}
        <span style={{
          fontFamily:  'var(--font-mono)',
          fontSize:    '11px',
          fontWeight:  400,
          color:       'var(--text-tertiary)',
          fontVariantNumeric: 'tabular-nums',
          minWidth:    '88px', /* prevents layout shift as digits change */
        }}>
          {clock}
        </span>

        <VerticalDivider mx={12} />

        <ThemeToggle theme={theme} toggle={toggle} />
      </div>

    </header>
  );
}
