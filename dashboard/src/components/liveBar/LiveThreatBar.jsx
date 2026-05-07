import React, { useState, useEffect } from 'react';
import UPIStreamLine from './UPIStreamLine';
import ScoreBandCounts from './ScoreBandCounts';
import SystemHealth from './SystemHealth';
import { useLiveThreatData } from './useLiveThreatData';
import styles from './LiveThreatBar.module.css';

const LiveThreatBar = ({ pollingInterval = 5000, mockMode = true, onImminentAccount, onSystemDegraded }) => {
  const {
    bandCounts,
    highestScore,
    highestScoreAccountId,
    pendingReview,
    systemHealth,
    upiVelocity,
    barState,
    scanningFlags
  } = useLiveThreatData({ pollingInterval, mockMode, onImminentAccount, onSystemDegraded });

  const [pulsePending, setPulsePending] = useState(false);
  const [preciseTime, setPreciseTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const ms = now.getMilliseconds().toString().padStart(3, '0');
      setPreciseTime(now.toLocaleTimeString('en-GB', { hour12: false }) + ':' + ms);
    }, 47); // Prime number interval for mechanical feel
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (pendingReview > 0) {
      setPulsePending(true);
      const timer = setTimeout(() => setPulsePending(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [pendingReview]);

  const isFinacleDown = systemHealth.FINACLE_FEED === 'DOWN' || systemHealth.FINACLE_FEED === 'ERROR';

  return (
    <div className={styles.bar} data-bar-state={barState.toLowerCase()}>
      <UPIStreamLine upiVelocity={upiVelocity} isStopped={isFinacleDown} />
      
      <div className={styles.content}>
        <div className={styles.thermalNoise} />
        <section className={styles.left}>
          <div className={styles.clockBox}>
            <span className={styles.microLabel}>BANK_TIME</span>
            <span className={styles.clockValue}>{preciseTime}</span>
          </div>
          <ScoreBandCounts bandCounts={bandCounts} scanningFlags={scanningFlags} />
        </section>

        <section className={styles.center}>
          <div className={styles.highestScoreBox}>
            <div className={styles.microLabel}>HIGHEST ACTIVE</div>
            <div className={styles.score}>{highestScore.toFixed(1)}</div>
            <div className={styles.accountId}>{highestScoreAccountId}</div>
          </div>
        </section>

        <section className={styles.right}>
          <div className={styles.healthRow}>
            <SystemHealth systemHealth={systemHealth} />
          </div>
          {pendingReview > 0 && (
            <div className={`${styles.pendingRow} ${pulsePending ? styles.pulse : ''}`}>
              <span className={styles.microLabel}>PENDING REVIEW</span>
              <span className={styles.pendingCount}>{pendingReview}</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default LiveThreatBar;
