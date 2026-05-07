import React from 'react';
import styles from './SignalTag.module.css';

const SignalTag = ({ signalName, contribution, inverted = false }) => {
  return (
    <div className={`${styles.wrapper} ${inverted ? styles.inverted : ''}`}>
      <span className={styles.name}>{signalName}</span>
      <span className={styles.divider}>·</span>
      <span className={styles.contribution}>+{contribution.toString().padStart(2, '0')}</span>
    </div>
  );
};

export default SignalTag;
