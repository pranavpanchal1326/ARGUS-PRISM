import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { springSmooth } from '../design/motion';

/* ─── Nav item data ─────────────────────────────────────── */
const SECTIONS = [
  {
    label: 'MONITORING',
    items: [
      { label: 'Alert Queue',      viewKey: 'ALERT_QUEUE',      icon: '⚠',  badgeKey: 'alertCount',    prefetch: () => import('../views/AlertQueue') },
      { label: 'Account Timeline', viewKey: 'ACCOUNT_TIMELINE', icon: '∿',  badgeKey: null,             prefetch: () => import('../views/AccountTimeline') },
      { label: 'Flow Graph',       viewKey: 'FLOW_GRAPH',       icon: '⬡',  badgeKey: null,             prefetch: () => import('../views/FlowGraph') },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { label: 'Recruiter Map', viewKey: 'RECRUITER_MAP', icon: '⎇', badgeKey: 'recruiterCount',  prefetch: () => import('../views/RecruiterMap') },
      { label: 'AutoSTR',       viewKey: 'AUTOSTR',       icon: '▣', badgeKey: 'pendingStrCount', prefetch: () => import('../views/AutoSTR') },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Health', viewKey: 'HEALTH', icon: '○', badgeKey: null, prefetch: null },
    ],
  },
];

/* ─── useSidebarCounts ──────────────────────────────────── */
function useSidebarCounts() {
  const [counts, setCounts] = useState({
    alertCount: 0, recruiterCount: 0, pendingStrCount: 0,
  });
  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch('/api/alerts/counts');
        if (!res.ok) return;
        const data = await res.json();
        setCounts(data);
      } catch { /* retain last known */ }
    }
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);
  return counts;
}

/* ─── Sub-components ────────────────────────────────────── */
function SidebarBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span style={{
      background: 'var(--accent)', color: 'var(--bg-base)',
      fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 400,
      padding: '1px 6px', borderRadius: '999px',
      minWidth: '18px', textAlign: 'center', lineHeight: '16px',
    }}>
      {count}
    </span>
  );
}

function SectionLabel({ text }) {
  return (
    <div style={{
      fontFamily: 'var(--font-ui)', fontSize: '9px', fontWeight: 600,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--text-tertiary)', padding: '0 16px', marginBottom: '8px',
    }}>
      {text}
    </div>
  );
}

function SidebarDivider() {
  return <div style={{ height: '1px', background: 'var(--border-default)', margin: '16px 0' }} />;
}

/* ─── NavItem ───────────────────────────────────────────── */
function NavItem({ label, viewKey, icon, count, isActive, onNavigate, prefetch }) {
  const [hovered, setHovered] = useState(false);
  function handleMouseEnter() {
    setHovered(true);
    if (prefetch) prefetch().catch(() => {});
  }
  return (
    <button
      onClick={() => onNavigate(viewKey)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:     'flex',
        alignItems:  'center',
        width:       '100%',
        padding:     isActive ? '8px 16px 8px 14px' : '8px 16px',
        border:      'none',
        background:  (isActive || hovered) ? 'var(--bg-subtle)' : 'transparent',
        cursor:      'pointer',
        textAlign:   'left',
        gap:         '10px',
        position:    'relative',
        transition:  'background 0.15s ease',
        borderRadius: 0,
      }}
    >
      {/* Sliding accent indicator — layoutId creates spring slide */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-indicator"
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: '2px', background: 'var(--accent)',
            borderRadius: '0 1px 1px 0',
          }}
          transition={springSmooth}
        />
      )}

      <span style={{
        fontSize: '14px', width: '18px', flexShrink: 0, textAlign: 'center', lineHeight: 1,
        color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
        transition: 'color 0.15s ease',
      }}>
        {icon}
      </span>

      <span style={{
        fontFamily: 'var(--font-ui)', fontSize: '13px', flex: 1,
        fontWeight: isActive ? 500 : 400,
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        transition: 'color 0.15s ease',
      }}>
        {label}
      </span>

      <SidebarBadge count={count} />
    </button>
  );
}

/* ─── Sidebar ───────────────────────────────────────────── */
export default function Sidebar({ currentView, onNavigate }) {
  const counts = useSidebarCounts();

  function getCount(badgeKey) {
    return badgeKey ? (counts[badgeKey] ?? 0) : 0;
  }

  return (
    <aside style={{
      position:      'fixed',
      top:           '56px',
      left:          0,
      bottom:        0,
      minWidth:      '220px',
      maxWidth:      '220px',
      background:    'var(--bg-surface)',
      borderRight:   '1px solid var(--border-default)',
      overflowY:     'auto',
      padding:       '20px 0 48px',
      display:       'flex',
      flexDirection: 'column',
    }}>
      {SECTIONS.map((section, si) => (
        <React.Fragment key={section.label}>
          {si > 0 && <SidebarDivider />}
          <SectionLabel text={section.label} />
          {section.items.map(item => (
            <NavItem
              key={item.viewKey}
              label={item.label}
              viewKey={item.viewKey}
              icon={item.icon}
              count={getCount(item.badgeKey)}
              isActive={currentView === item.viewKey}
              onNavigate={onNavigate}
              prefetch={item.prefetch}
            />
          ))}
        </React.Fragment>
      ))}

      {/* Version tag */}
      <div style={{
        position: 'absolute', bottom: '16px', left: '16px',
        fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 400,
        color: 'var(--text-tertiary)', pointerEvents: 'none',
      }}>
        PRISM v2.0 · iDEA 2.0
      </div>
    </aside>
  );
}
