import React from 'react';
import { velocityToStreamDuration } from './useLiveThreatData';
import styles from './UPIStreamLine.module.css';

const UPIStreamLine = ({ upiVelocity, isStopped }) => {
  const duration = velocityToStreamDuration(upiVelocity);
  
  return (
    <div 
      className={styles.container} 
      style={{ 
        '--stream-speed': `${duration}ms`,
        animationPlayState: isStopped ? 'paused' : 'running'
      }}
    >
      <div className={styles.streamLine} />
      {isStopped && (
        <div className={styles.errorIndicator}>
          FEED INTERRUPTED · FALLBACK TO CACHE
        </div>
      )}
    </div>
  );
};

export default UPIStreamLine;
