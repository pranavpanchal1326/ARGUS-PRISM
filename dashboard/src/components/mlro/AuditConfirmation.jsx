import React, { useState, useEffect } from 'react';
import styles from './AuditConfirmation.module.css';

const AuditField = ({ label, value, isLast, onComplete, color }) => {
  const [displayedValue, setDisplayedValue] = useState('');
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < value.length) {
        setDisplayedValue(prev => prev + value[index]);
        index++;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 28);
    return () => clearInterval(interval);
  }, [value, onComplete]);

  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue} style={{ color: color || 'var(--instrument-white)' }}>
        {displayedValue}
      </span>
    </div>
  );
};

const AuditConfirmation = ({ auditRecord, onClose, onViewStatus }) => {
  const [visibleFields, setVisibleFields] = useState(0);
  const [showButtons, setShowButtons] = useState(false);

  const fields = [
    { label: 'AUDIT ID', value: auditRecord.auditId, color: 'var(--phosphor)' },
    { label: 'DECISION', value: auditRecord.decisionType },
    { label: 'LEGAL ACTION', value: auditRecord.legalAction },
    { label: 'OFFICER', value: auditRecord.mlroId },
    { label: 'TIMESTAMP', value: auditRecord.timestamp },
    { label: 'CASE', value: auditRecord.caseId },
    { label: 'ACCOUNT', value: auditRecord.accountId },
    { label: 'STATUS', value: auditRecord.nextStatus }
  ];

  const handleFieldComplete = () => {
    if (visibleFields < fields.length - 1) {
      setVisibleFields(prev => prev + 1);
    } else {
      setTimeout(() => setShowButtons(true), 800);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>DECISION RECORDED</div>
        <div className={styles.divider} />
      </header>

      <main className={styles.auditLog}>
        <div className={styles.submittedStamp}>SUBMITTED TO FIU-IND</div>
        {fields.slice(0, visibleFields + 1).map((field, i) => (
          <AuditField 
            key={i}
            label={field.label}
            value={field.value}
            color={field.color}
            onComplete={i === visibleFields ? handleFieldComplete : null}
          />
        ))}
      </main>

      <div className={styles.divider} style={{ margin: '24px 0' }} />

      {showButtons && (
        <footer className={styles.footer}>
          <div className={styles.scanline} />
          <button className={styles.secondaryBtn} onClick={onClose}>CLOSE</button>
          <button className={styles.primaryBtn} onClick={() => onViewStatus(auditRecord.caseId)}>
            VIEW CASE STATUS
          </button>
        </footer>
      )}
    </div>
  );
};

export default AuditConfirmation;
