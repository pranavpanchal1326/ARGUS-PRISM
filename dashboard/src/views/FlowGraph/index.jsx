export default function FlowGraphView() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', flexDirection: 'column', gap: '12px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
        View
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 700,
        fontVariationSettings: "'opsz' 36, 'WONK' 0", color: 'var(--text-primary)' }}>
        Flow Graph
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
        Phase 5 content slots here
      </span>
    </div>
  );
}
