// RecruiterClassBadge — classification atom
const CLASS_CONFIG = {
  COORDINATOR:   { label: 'Coordinator',   description: '5–15 accounts',  heatVar: '--heat-2', icon: '◈' },
  ORCHESTRATOR:  { label: 'Orchestrator',  description: '15–40 accounts', heatVar: '--heat-3', icon: '◉' },
  PLATFORM_SCALE:{ label: 'Platform Scale',description: '40+ accounts',   heatVar: '--heat-4', icon: '⬟' },
};

export function RecruiterClassBadge({ classification, size = 'sm' }) {
  const cfg     = CLASS_CONFIG[classification] || CLASS_CONFIG.COORDINATOR;
  const isLg    = size === 'lg';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: isLg ? '4px 12px' : '2px 8px',
      borderRadius: '4px',
      background: `color-mix(in srgb, var(${cfg.heatVar}) 10%, transparent)`,
      border:     `1px solid color-mix(in srgb, var(${cfg.heatVar}) 20%, transparent)`,
      color:      `var(${cfg.heatVar})`,
      fontFamily: 'var(--font-ui)',
      fontSize:   isLg ? '11px' : '9px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: isLg ? '13px' : '10px' }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
