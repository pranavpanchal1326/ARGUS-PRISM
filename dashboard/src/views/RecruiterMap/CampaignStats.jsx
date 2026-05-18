// CampaignStats — 4 KPI tiles above CampaignGraph
export function CampaignStats({ recruiter: r }) {
  const lakhsStr = `₹${(r.totalAmountTransacted / 100000).toFixed(2)}L`;

  const tiles = [
    { label: 'DOWNSTREAM ACCOUNTS', value: r.downtreamCount,
      valueStyle: { fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700,
        fontVariationSettings: "'opsz' 36, 'WONK' 0", color: 'var(--text-primary)' } },
    { label: 'ACTIVE',              value: r.activeCount,
      valueStyle: { fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700,
        fontVariationSettings: "'opsz' 36, 'WONK' 0", color: 'var(--heat-2)' } },
    { label: 'FROZEN',              value: r.frozenCount,
      valueStyle: { fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700,
        fontVariationSettings: "'opsz' 36, 'WONK' 0", color: 'var(--heat-4)' } },
    { label: 'TOTAL TRANSACTED',    value: lakhsStr,
      valueStyle: { fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 500,
        color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' } },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
      {tiles.map(tile => (
        <div key={tile.label} style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: '12px', padding: '16px 20px',
        }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: '9px', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)',
            marginBottom: '8px' }}>
            {tile.label}
          </div>
          <div style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1, ...tile.valueStyle }}>
            {tile.value}
          </div>
        </div>
      ))}
    </div>
  );
}
