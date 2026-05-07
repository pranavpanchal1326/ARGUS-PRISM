import React from 'react';

export const ThresholdAnnotations = (props) => {
  const { viewBox, value } = props;
  const { x, y, width } = viewBox;

  const isCritical = value === 75;
  const isImminent = value === 85;

  return (
    <foreignObject 
      x={width + x - 120} 
      y={y - 12} 
      width={140} 
      height={24}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: '100%'
      }}>
        <div style={{
          fontSize: '9px',
          fontFamily: 'Inter',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '3px 6px',
          backgroundColor: isImminent ? 'var(--phosphor)' : 'var(--void)',
          color: isImminent ? 'var(--void)' : 'var(--instrument-white)',
          border: isImminent ? 'none' : '1px solid var(--instrument-dark)',
          whiteSpace: 'nowrap'
        }}>
          {value} · {isImminent ? 'AUTOSTR INITIATED' : 'KYC RESTRICTION'}
        </div>
      </div>
    </foreignObject>
  );
};

export default ThresholdAnnotations;
