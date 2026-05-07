import React from 'react';

const FRIBadge = ({ score, warmthScore }) => {
  const showContradiction = score === 'LOW' && warmthScore >= 75;

  const getValueColor = () => {
    switch (score) {
      case 'LOW':
      case 'MEDIUM':
        return 'var(--instrument-white)';
      case 'HIGH':
        return 'var(--instrument-white)';
      case 'VERY HIGH':
        return 'var(--phosphor)';
      default:
        return 'var(--instrument-white)';
    }
  };

  return (
    <div className="fri-badge">
      <div className="fri-badge__label">FRI SCORE</div>
      <div 
        className="fri-badge__value" 
        style={{ 
          color: getValueColor(),
          borderLeft: score === 'HIGH' ? '1px solid var(--phosphor)' : 'none',
          paddingLeft: score === 'HIGH' ? '8px' : '0'
        }}
      >
        {score}
      </div>
      
      {showContradiction && (
        <div className="fri-badge__contradiction">
          ⚠ CONTRADICTS WARMTHSCORE
        </div>
      )}
    </div>
  );
};

export default FRIBadge;
