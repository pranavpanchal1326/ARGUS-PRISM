import React, { useState, useEffect, useRef } from 'react';

const ViewTransition = ({ activeView, children }) => {
  const [displayView, setDisplayView] = useState(activeView);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [scanY, setScanY] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle, exit, enter
  const containerRef = useRef(null);

  useEffect(() => {
    if (activeView === displayView) return;

    // Start transition sequence
    setIsTransitioning(true);
    setPhase('exit');
    setScanY(0);

    let startTime;
    const exitDuration = 60;
    const enterDuration = 90;

    const animateExit = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const height = containerRef.current.clientHeight;
      
      const newY = (progress / exitDuration) * height;
      setScanY(newY);

      if (progress < exitDuration) {
        requestAnimationFrame(animateExit);
      } else {
        // Exit complete
        setDisplayView(activeView);
        setPhase('enter');
        setScanY(0);
        startTime = null;
        requestAnimationFrame(animateEnter);
      }
    };

    const animateEnter = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const height = containerRef.current.clientHeight;
      
      const newY = (progress / enterDuration) * height;
      setScanY(newY);

      if (progress < enterDuration) {
        requestAnimationFrame(animateEnter);
      } else {
        // Enter complete
        setIsTransitioning(false);
        setPhase('idle');
      }
    };

    requestAnimationFrame(animateExit);

  }, [activeView, displayView]);

  return (
    <div ref={containerRef} className="view-transition-wrapper">
      <div 
        className="view-content" 
        style={{ 
          clipPath: phase === 'exit' 
            ? `inset(${scanY}px 0 0 0)` 
            : phase === 'enter'
              ? `inset(0 0 ${containerRef.current?.clientHeight - scanY}px 0)`
              : 'none'
        }}
      >
        {children(displayView)}
      </div>

      {isTransitioning && (
        <div 
          className="scan-line" 
          style={{ top: `${scanY}px` }} 
        />
      )}
    </div>
  );
};

export default ViewTransition;
