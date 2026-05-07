import React from 'react';

const SignalEventMarkers = ({ data, bounds }) => {
  if (!bounds) return null;

  const { x, y, width, height } = bounds;
  const xMin = 0;
  const xMax = 72;

  const getXPosition = (hour) => {
    const percent = (hour - xMin) / (xMax - xMin);
    return x + (percent * width);
  };

  return (
    <div className="signal-markers-overlay">
      {data.map((point, index) => {
        if (!point.signal_fired && !point.threshold_crossed) return null;

        const leftPos = getXPosition(point.hour);

        return (
          <div 
            key={index} 
            className="signal-marker" 
            style={{ left: `${leftPos}px`, height: `${height}px`, top: `${y}px` }}
          >
            <div className="signal-marker__line" />
            
            <div className="signal-marker__label">
              {point.signal_number && (
                <span className="signal-number">S{point.signal_number}</span>
              )}
              <span className="signal-name">
                {point.signal_fired || point.event_label}
              </span>
              {point.threshold_crossed && (
                <span style={{ 
                  color: point.threshold_crossed === 'AUTOSTR_INITIATED' ? 'var(--phosphor)' : 'var(--instrument-white)',
                  fontWeight: 600,
                  marginTop: '12px'
                }}>
                  {point.threshold_crossed.replace('_', ' ')} ACTIVE
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SignalEventMarkers;
