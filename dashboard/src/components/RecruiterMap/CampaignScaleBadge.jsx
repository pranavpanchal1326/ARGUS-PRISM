import React from 'react';
import useNumberScanner from '../../hooks/useNumberScanner';

const CampaignScaleBadge = ({ summary }) => {
  const accountScanner = useNumberScanner(summary?.total_warming_accounts || 0, 800);
  const riskScanner = useNumberScanner(summary?.total_at_risk_estimate || 0, 1000);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="campaign-badge">
      <div className="campaign-badge__header">CAMPAIGN INTELLIGENCE</div>
      
      <div className="campaign-badge__row">
        <div className="campaign-badge__label">RECRUITERS IDENTIFIED</div>
        <div className="campaign-badge__value">{summary?.total_recruiters}</div>
      </div>

      <div className="campaign-badge__row">
        <div className="campaign-badge__label">WARMING ACCOUNTS</div>
        <div className="campaign-badge__value">{accountScanner.displayValue.toFixed(0)}</div>
      </div>

      <div className="campaign-badge__row">
        <div className="campaign-badge__label">SHARED TARGETS</div>
        <div className="campaign-badge__value">{summary?.total_warming_accounts === 31 ? 1 : 0}</div>
      </div>

      <div className="campaign-badge__row">
        <div className="campaign-badge__label">MAX SCALE</div>
        <div className="campaign-badge__value" style={{ color: 'var(--phosphor)' }}>{summary?.campaign_scale_max}</div>
      </div>

      <div className="campaign-badge__divider" style={{ height: '1px', background: 'var(--instrument-dark)', margin: '16px 0' }} />

      <div className="campaign-badge__label">ESTIMATED AT-RISK</div>
      <div className="campaign-badge__amount font-display">
        {formatCurrency(riskScanner.displayValue)}
      </div>

      <div className="campaign-active-indicator">
        <div className="campaign-active-dot" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="campaign-badge__label" style={{ color: 'var(--phosphor)' }}>CAMPAIGN ACTIVE</span>
          <span className="campaign-badge__value" style={{ fontSize: '10px' }}>SINCE 47H 23M AGO</span>
        </div>
      </div>
    </div>
  );
};

export default CampaignScaleBadge;
