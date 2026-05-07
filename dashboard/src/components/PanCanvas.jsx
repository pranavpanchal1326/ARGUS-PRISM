import React from 'react';
import AlertQueue from './AlertQueue/AlertQueue';
import AccountTimeline from './AccountTimeline/AccountTimeline';
import FlowGraph from './FlowGraph/FlowGraph';
import RecruiterMap from './RecruiterMap/RecruiterMap';
import AutoSTRPreview from './AutoSTRPreview/AutoSTRPreview';

const PanCanvas = ({ currentPanel }) => {
  const panelNames = [
    "01 · ALERT QUEUE",
    "02 · ACCOUNT TIMELINE",
    "03 · FLOWGRAPH",
    "04 · RECRUITER MAP",
    "05 · AUTOSTR PREVIEW"
  ];

  return (
    <div 
      className="pan-canvas" 
      style={{ transform: `translateX(-${currentPanel * 100}vw)` }}
    >
      {panelNames.map((name, i) => (
        <section key={i} className="canvas-panel">
          {i === 0 ? (
            <AlertQueue />
          ) : i === 1 ? (
            <AccountTimeline />
          ) : i === 2 ? (
            <FlowGraph />
          ) : i === 3 ? (
            <RecruiterMap />
          ) : i === 4 ? (
            <AutoSTRPreview />
          ) : (
            <div className="placeholder-panel">
              <h1 className="placeholder-text font-display">{name}</h1>
            </div>
          )}

          {/* Panel Label (Fixed position relative to panel) */}
          <div className="panel-label font-ui">
            <span className={currentPanel === i ? 'phosphor-text' : 'ghost-text'}>
              {name}
            </span>
          </div>

          {/* Deep Enhancement: Spatial Metadata */}
          <div className="panel-metadata font-data ghost-text">
            [SEC_{i+1}] · POS_{i * 100}VW · 00VH
          </div>
        </section>
      ))}

      {/* Global Coordinate Display */}
      <div className="global-coordinates font-data phosphor-text">
        [COORD_X: {currentPanel * 100}VW] [COORD_Y: 0000] [STRM: LIVE]
      </div>

      <style jsx="true">{`
        .pan-canvas {
          display: flex;
          width: 500vw;
          height: 100vh;
          transition: transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
          will-change: transform;
        }

        .canvas-panel {
          width: 100vw;
          height: 100vh;
          padding: 48px;
          padding-top: 49px; /* 48px + 1px for live line */
          position: relative;
          border-right: 1px solid var(--instrument-ghost);
        }

        .placeholder-panel {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .placeholder-text {
          font-size: 48px;
          color: var(--instrument-dark);
          opacity: 0.15;
          user-select: none;
        }

        .panel-label {
          position: absolute;
          bottom: 24px;
          left: 48px;
          font-size: 10px;
          letter-spacing: 0.12em;
        }

        .panel-metadata {
          position: absolute;
          top: 72px;
          right: 48px;
          font-size: 9px;
          letter-spacing: 0.05em;
          opacity: 0.4;
        }

        .global-coordinates {
          position: fixed;
          bottom: 24px;
          right: 48px;
          font-size: 9px;
          letter-spacing: 0.1em;
          z-index: 1000;
          background-color: var(--void);
          padding: 4px 8px;
          border-left: 1px solid var(--phosphor);
        }
      `}</style>
    </div>
  );
};

export default PanCanvas;
