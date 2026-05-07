import React from 'react';
import styles from './QueueHeader.module.css';

const QueueHeader = ({ 
  imminentCount, 
  criticalCount, 
  hotCount, 
  warmingCount, 
  totalCount, 
  lastRefreshed 
}) => {
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-GB', { hour12: false });
  };

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <h1 className={styles.title}>ALERT QUEUE</h1>
        <div className={styles.refresh}>
          REFRESHED {formatTime(lastRefreshed)}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.statsRow}>
        <div className={`${styles.statBand} ${imminentCount > 0 ? styles.imminentActive : ''}`}>
          <div className={styles.count}>{imminentCount}</div>
          <div className={styles.label}>IMMINENT</div>
        </div>

        <div className={styles.statDivider} />

        <div className={`${styles.statBand} ${criticalCount > 0 ? styles.criticalActive : ''}`}>
          <div className={styles.count}>{criticalCount}</div>
          <div className={styles.label}>CRITICAL</div>
        </div>

        <div className={styles.statDivider} />

        <div className={`${styles.statBand} ${hotCount > 0 ? styles.hotActive : ''}`}>
          <div className={styles.count}>{hotCount}</div>
          <div className={styles.label}>HOT</div>
        </div>

        <div className={styles.statDivider} />

        <div className={styles.statBand}>
          <div className={styles.count}>{warmingCount}</div>
          <div className={styles.label}>WARMING</div>
        </div>
      </div>

      <div className={styles.footerRow}>
        TOTAL MONITORED: {totalCount.toString().padStart(3, '0')}
      </div>
    </div>
  );
};

export default QueueHeader;
