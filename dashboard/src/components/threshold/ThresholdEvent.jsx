import React, { useState, useEffect, useRef } from 'react';
import styles from './ThresholdEvent.module.css';

const ThresholdEvent = ({ threshold, accountId, score, timestamp, onAcknowledge, onViewTimeline }) => {
  const [teletypeSummary, setTeletypeSummary] = useState('');
  const [visibleActions, setVisibleActions] = useState([]);
  const [displayScore, setDisplayScore] = useState(0);
  const pulseRef = useRef(null);
  const isCritical = threshold.severity === 'CRITICAL';

  // 1. Viewport Flash and Pulse for CRITICAL
  useEffect(() => {
    if (isCritical) {
      document.body.classList.add(styles.viewportFlash);
      const timer = setTimeout(() => {
        document.body.classList.remove(styles.viewportFlash);
      }, 100);

      let pulseOn = false;
      pulseRef.current = setInterval(() => {
        pulseOn = !pulseOn;
        const panel = document.getElementById('threshold-panel');
        if (panel) {
          panel.style.boxShadow = pulseOn ? '0 0 0 3px #B8FF6B' : '0 0 0 1px #B8FF6B';
        }
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(pulseRef.current);
        document.body.classList.remove(styles.viewportFlash);
      };
    }
  }, [isCritical]);

  // 2. Number Scanning for Score
  useEffect(() => {
    let count = 0;
    const interval = setInterval(() => {
      if (count < 15) {
        setDisplayScore(Math.floor(Math.random() * 90) + 10);
        count++;
      } else {
        setDisplayScore(Math.floor(score));
        clearInterval(interval);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [score]);

  // 3. Teletype Summary
  useEffect(() => {
    let index = 0;
    setTeletypeSummary('');
    const summary = threshold.legalSummary;
    const interval = setInterval(() => {
      if (index < summary.length) {
        setTeletypeSummary(prev => prev + summary[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 28);
    return () => clearInterval(interval);
  }, [threshold.legalSummary]);

  // 4. Staggered Action Reveal
  useEffect(() => {
    setVisibleActions([]);
    threshold.actions.forEach((action, i) => {
      setTimeout(() => {
        setVisibleActions(prev => [...prev, action]);
      }, i * 400);
    });
  }, [threshold.actions]);

  const containerClass = `${styles.panel} ${isCritical ? styles.critical : styles.warning}`;

  return (
    <div className={styles.overlay}>
      <div id="threshold-panel" className={containerClass}>
        <div className={styles.scanline} />
        
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.waveform}>
              <div className={styles.waveBar} />
              <div className={styles.waveBar} />
              <div className={styles.waveBar} />
              <div className={styles.waveBar} />
            </div>
            LEGAL EVENT · <span className={styles.mono}>{timestamp}</span>
          </div>
          <div className={styles.divider} />
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${(visibleActions.length / threshold.actions.length) * 100}%` }} 
            />
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.scoreArea}>
            <span className={styles.scoreValue}>{displayScore}</span>
            <div className={styles.thresholdName}>{threshold.name}</div>
          </div>

          <div className={styles.legalSection}>
            <div className={styles.sectionLabel}>LEGAL BASIS</div>
            <div className={styles.legalBasis}>{threshold.legalBasis}</div>
          </div>

          <div className={styles.divider} />

          <div className={styles.summarySection}>
            <div className={styles.sectionLabel}>LEGAL SUMMARY</div>
            <div className={styles.teletype}>{teletypeSummary}</div>
          </div>

          <div className={styles.divider} />

          <div className={styles.actionSection}>
            <div className={styles.sectionLabel}>ACTIONS INITIATED</div>
            <ul className={styles.actionList}>
              {visibleActions.map((action, i) => (
                <li key={i} className={styles.actionItem}>
                  <span className={styles.bullet}>✦</span> {action}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.divider} />

          <div className={styles.accountSection}>
            <div className={styles.sectionLabel}>ACCOUNT</div>
            <div className={styles.mono}>{accountId}</div>
          </div>
        </main>

        <footer className={styles.footer}>
          <button className={styles.btnAcknowledge} onClick={onAcknowledge}>
            ACKNOWLEDGE
          </button>
          <button className={styles.btnTimeline} onClick={() => onViewTimeline(accountId)}>
            VIEW ACCOUNT TIMELINE
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ThresholdEvent;
