import React from 'react';
import styles from './TaintIndicator.module.css';

const TaintIndicator = ({ taintScore, hopCount, inverted = false }) => {
  if (taintScore === 0) return null;

  return (
    <div className={`${styles.wrapper} ${inverted ? styles.inverted : ''}`}>
      <div className={styles.bar} />
      <div className={styles.content}>
        <div className={styles.label}>NETWORK TAINT</div>
        <div className={styles.value}>
          SCORE {taintScore} · {hopCount} HOP REMOVED
        </div>
      </div>
    </div>
  );
};

export default TaintIndicator;
