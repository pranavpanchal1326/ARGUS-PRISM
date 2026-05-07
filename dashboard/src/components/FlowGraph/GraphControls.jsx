import React from 'react';

const GraphControls = ({ 
  zoomLevel, 
  onZoomIn, 
  onZoomOut, 
  onZoomFit, 
  activeFilter, 
  onFilterChange, 
  onIdentifyRecruiter 
}) => {
  return (
    <div className="graph-controls">
      {/* Zoom Controls */}
      <div className="graph-controls__group">
        <button className="graph-controls__btn" onClick={onZoomIn}>+</button>
        <div className="zoom-level-display">{zoomLevel}×</div>
        <button className="graph-controls__btn" onClick={onZoomOut}>−</button>
        <button className="graph-controls__btn" onClick={onZoomFit}>FIT</button>
      </div>

      {/* Filter Controls */}
      <div className="graph-controls__row">
        {['ALL', 'LAYERING', 'ROUND-TRIP', 'RECRUITER'].map(filter => (
          <button 
            key={filter}
            className={`graph-controls__btn ${activeFilter === filter ? 'graph-controls__btn--active' : ''}`}
            onClick={() => onFilterChange(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="graph-controls__row">
        <button className="graph-controls__btn graph-controls__btn--disabled">EXPORT GRAPH</button>
        <button className="graph-controls__btn" onClick={onIdentifyRecruiter}>IDENTIFY RECRUITER</button>
        <button className="graph-controls__btn graph-controls__btn--disabled">FREEZE NETWORK</button>
      </div>
    </div>
  );
};

export default GraphControls;
