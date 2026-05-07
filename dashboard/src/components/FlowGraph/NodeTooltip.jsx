import React from 'react';

const NodeTooltip = ({ node, onClose, position }) => {
  if (!node) return null;

  const style = {
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'translate(-50%, -100%)',
    marginTop: '-20px'
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="node-tooltip" style={style}>
      <div className="node-tooltip__header">
        <div className="node-tooltip__type">{node.node_type}</div>
        <button className="node-tooltip__close" onClick={onClose}>×</button>
      </div>
      
      <span className="node-tooltip__account">{node.account_id}</span>

      <div className="node-tooltip__stat">
        <div className="node-tooltip__label">WARMTHSCORE</div>
        <div className="node-tooltip__score">{node.warmth_score.toFixed(1)}</div>
      </div>

      <div className="node-tooltip__stat">
        <div className="node-tooltip__label">SEVERITY</div>
        <div className="node-tooltip__value" style={{ color: node.severity === 'IMMINENT' ? 'var(--phosphor)' : 'var(--instrument-white)' }}>
          {node.severity}
        </div>
      </div>

      <div className="node-tooltip__divider" />

      <div className="node-tooltip__stat">
        <div className="node-tooltip__label">DECLARED PROFILE</div>
        <div className="node-tooltip__value">{node.declared_profile}</div>
      </div>

      <div className="node-tooltip__stat">
        <div className="node-tooltip__label">48H VOLUME</div>
        <div className="node-tooltip__value">{formatCurrency(node.transaction_volume_48h)}</div>
      </div>

      <div className="node-tooltip__stat">
        <div className="node-tooltip__label">ACCOUNT AGE</div>
        <div className="node-tooltip__value">{node.account_age_days} DAYS</div>
      </div>

      {node.taint_score > 0 && (
        <>
          <div className="node-tooltip__divider" />
          <div className="node-tooltip__stat">
            <div className="node-tooltip__label">TAINT SCORE</div>
            <div className="node-tooltip__value" style={{ color: 'var(--phosphor)' }}>{node.taint_score}</div>
          </div>
          <div className="node-tooltip__stat">
            <div className="node-tooltip__label">TAINT SOURCE</div>
            <div className="node-tooltip__value">Prior network link</div>
          </div>
        </>
      )}

      {node.node_type === 'RECRUITER' && (
        <div className="node-tooltip__warning">
          <div className="node-tooltip__warning-title">⚠ RECRUITER NODE DETECTED</div>
          <div className="node-tooltip__warning-text">
            Campaign coordinator identified. Restrict outbound transfers above ₹5,000 immediately.
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeTooltip;
