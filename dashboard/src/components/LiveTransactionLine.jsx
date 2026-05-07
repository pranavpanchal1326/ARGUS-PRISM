import React from 'react';

const LiveTransactionLine = () => {
  return (
    <div className="live-line-container">
      <div className="live-line-track">
        <div className="live-line-indicator" />
      </div>

      <style jsx="true">{`
        .live-line-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 1px;
          background-color: var(--instrument-dark);
          z-index: 1000;
          overflow: hidden;
        }

        .live-line-track {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .live-line-indicator {
          width: 120px;
          height: 100%;
          background-color: var(--phosphor);
          position: absolute;
          left: 0;
          top: 0;
          animation: slideLine 1.8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LiveTransactionLine;
