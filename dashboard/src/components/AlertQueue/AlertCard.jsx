import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from './AlertCard.module.css';
import SignalTag from './SignalTag';
import TaintIndicator from './TaintIndicator';
import { resolveCardState } from './alertQueueConfig';

const AlertCard = ({ 
  alert, 
  isScanning: externalScanning, 
  onAction, 
  onExpand 
}) => {
  const [stage, setStage] = useState('MOUNTING');
  const [displayScore, setDisplayScore] = useState(alert.warmthScore);
  const [typedAccountId, setTypedAccountId] = useState('');
  const [elapsed, setElapsed] = useState('');
  const [isExiting, setIsExiting] = useState(false);
  
  const cardRef = useRef(null);
  const intervalRef = useRef(null);
  const scoreIntervalRef = useRef(null);
  const typeTimeoutRef = useRef(null);
  
  const cardState = useMemo(() => resolveCardState(alert.warmthScore), [alert.warmthScore]);

  // Calculate elapsed time
  const calculateElapsed = (startTime) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}M`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours < 24) return `${hours}H ${mins}M`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}D ${remHours}H`;
  };

  useEffect(() => {
    setElapsed(calculateElapsed(alert.firstSignalAt));
    const timer = setInterval(() => {
      setElapsed(calculateElapsed(alert.firstSignalAt));
    }, 60000);
    return () => clearInterval(timer);
  }, [alert.firstSignalAt]);

  // Entry cascade
  useEffect(() => {
    const sequence = async () => {
      // 1. Expansion
      await new Promise(r => setTimeout(r, 16));
      setStage('ENTERING');
      await new Promise(r => setTimeout(r, 180));
      
      // 2. Scanning
      setStage('SCANNING');
      await new Promise(r => setTimeout(r, 200));
      
      // 3. Typing
      setStage('TYPING');
      let current = '';
      const target = alert.accountId;
      for (let i = 0; i < target.length; i++) {
        current += target[i];
        setTypedAccountId(current);
        await new Promise(r => setTimeout(r, 28));
      }
      
      // 4. Complete
      setStage('COMPLETE');
    };
    
    sequence();
  }, [alert.alertId, alert.accountId]);

  // Score scanning animation
  useEffect(() => {
    if (stage === 'SCANNING' || externalScanning) {
      scoreIntervalRef.current = setInterval(() => {
        setDisplayScore(Math.floor(Math.random() * 99));
      }, 16);
    } else {
      clearInterval(scoreIntervalRef.current);
      setDisplayScore(alert.warmthScore);
    }
    return () => clearInterval(scoreIntervalRef.current);
  }, [stage, externalScanning, alert.warmthScore]);

  // IMMINENT pulse
  useEffect(() => {
    if (cardState.id === 'IMMINENT' && cardRef.current) {
      let toggle = false;
      intervalRef.current = setInterval(() => {
        if (cardRef.current) {
          cardRef.current.style.boxShadow = toggle 
            ? '0 0 0 1px #B8FF6B' 
            : '0 0 0 4px rgba(184,255,107,0.3)';
          toggle = !toggle;
        }
      }, 1000);
    } else {
      if (cardRef.current) cardRef.current.style.boxShadow = 'none';
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [cardState.id]);

  const handleAction = (e) => {
    e.stopPropagation();
    if (onAction) onAction(cardState.actionLabel, alert.alertId, alert.accountId);
  };

  const handleAcknowledge = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (onAction) onAction('ACKNOWLEDGE', alert.alertId, alert.accountId);
    }, 120);
  };

  return (
    <div 
      ref={cardRef}
      className={`
        ${styles.card} 
        ${styles[cardState.id.toLowerCase()]} 
        ${isExiting ? styles.exiting : ''}
        ${stage === 'MOUNTING' ? styles.mounting : ''}
      `}
      style={{ opacity: cardState.opacity }}
      onClick={() => onExpand && onExpand(alert.alertId)}
    >
      <div className={styles.header}>
        <div className={styles.score} style={{ fontSize: cardState.scoreSize }}>
          {displayScore.toString().padStart(2, '0')}
        </div>
        <div className={styles.meta}>
          <div className={styles.activeTime}>ACTIVE · {elapsed}</div>
          <div className={styles.alertId}>{alert.alertId}</div>
        </div>
      </div>

      <div className={styles.accountId}>
        {typedAccountId}
      </div>


      <div className={styles.divider} />

      <div className={`${styles.signals} ${stage === 'COMPLETE' ? styles.visible : ''}`}>
        {alert.topSignals.map((signal, idx) => (
          <SignalTag 
            key={idx}
            signalName={signal.name}
            contribution={signal.contribution}
            inverted={cardState.inverted}
          />
        ))}
      </div>

      {alert.taint.score > 0 && (
        <div className={`${styles.taint} ${stage === 'COMPLETE' ? styles.visible : ''}`}>
          <TaintIndicator 
            taintScore={alert.taint.score}
            hopCount={alert.taint.hopCount}
            inverted={cardState.inverted}
          />
        </div>
      )}

      {cardState.actionEnabled && stage === 'COMPLETE' && (
        <>
          <div className={styles.divider} />
          <button className={styles.actionBtn} onClick={handleAction}>
            {cardState.actionLabel}
          </button>
        </>
      )}
    </div>
  );
};

export default AlertCard;
