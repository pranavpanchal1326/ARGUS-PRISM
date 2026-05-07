import React, { useState, useEffect, useRef } from 'react';
import { SCORE_BANDS } from './liveThreatConfig';
import styles from './ScoreBandCounts.module.css';

const BandUnit = ({ band, count, isScanning }) => {
  const [displayCount, setDisplayCount] = useState(count);
  const isImminent = band.id === 'IMMINENT';

  useEffect(() => {
    if (isScanning && !isImminent) {
      const interval = setInterval(() => {
        setDisplayCount(Math.floor(Math.random() * 9999));
      }, 16);
      setTimeout(() => {
        clearInterval(interval);
        setDisplayCount(count);
      }, 200);
      return () => clearInterval(interval);
    } else {
      setDisplayCount(count);
    }
  }, [count, isScanning, isImminent]);

  return (
    <div className={`${styles.unit} ${isImminent && count > 0 ? styles.imminentActive : ''}`}>
      <div className={styles.label} style={{ color: band.textColor }}>{band.label}</div>
      <div className={styles.count} style={{ color: band.countColor }}>
        {displayCount}
      </div>
    </div>
  );
};

const ScoreBandCounts = ({ bandCounts, scanningFlags }) => {
  return (
    <div className={styles.container}>
      {SCORE_BANDS.map((band, index) => (
        <React.Fragment key={band.id}>
          <BandUnit 
            band={band} 
            count={bandCounts[band.id] || 0} 
            isScanning={scanningFlags[band.id]}
          />
          {index < SCORE_BANDS.length - 1 && <div className={styles.divider} />}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ScoreBandCounts;
