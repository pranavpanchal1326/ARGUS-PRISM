import React, { useState, useEffect } from 'react';
import DecisionPanel from './DecisionPanel';
import AuditConfirmation from './AuditConfirmation';
import { useMLRODecision } from './useMLRODecision';
import styles from './MLROWorkflow.module.css';

const MLROWorkflow = ({ caseId, accountId, warmthScore, mlroId, autoSTRGrounds, onComplete }) => {
  const {
    stage,
    selectedDecision,
    selectDecision,
    reason,
    setReason,
    selectedCategory,
    setSelectedCategory,
    editedSTRGrounds,
    setEditedSTRGrounds,
    canConfirm,
    confirmDecision,
    submitDecision,
    resetWorkflow,
    auditRecord,
    error
  } = useMLRODecision({
    caseId,
    accountId,
    warmthScore,
    mlroId,
    autoSTRGrounds,
    onDecisionComplete: onComplete
  });

  const [loadingText, setLoadingText] = useState('');
  const [showJitter, setShowJitter] = useState(false);
  const fullLoadingMsg = 'VERIFYING MLRO IDENTITY · SECURE BIO-HANDSHAKE · RECORDING DECISION · DISPATCHING LEGAL ACTIONS...';

  useEffect(() => {
    if (stage === 'SUBMITTING') {
      let index = 0;
      setLoadingText('');
      const interval = setInterval(() => {
        if (index < fullLoadingMsg.length) {
          setLoadingText(prev => prev + fullLoadingMsg[index]);
          index++;
        } else {
          clearInterval(interval);
        }
      }, 20);
      return () => clearInterval(interval);
    }
  }, [stage]);

  const handleConfirmAttempt = () => {
    if (!canConfirm) {
      setShowJitter(true);
      setTimeout(() => setShowJitter(false), 300);
    } else {
      confirmDecision();
    }
  };

  if (stage === 'CONFIRMED' && auditRecord) {
    return (
      <div className={styles.workflowContainer}>
        <AuditConfirmation 
          auditRecord={auditRecord} 
          onClose={resetWorkflow}
          onViewStatus={(id) => console.log('Viewing status for case:', id)}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.workflowContainer} ${showJitter ? styles.jitter : ''}`}>
      <DecisionPanel 
        stage={stage}
        selectedDecision={selectedDecision}
        onSelect={selectDecision}
        accountId={accountId}
        warmthScore={warmthScore}
        mlroId={mlroId}
        reason={reason}
        setReason={setReason}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        editedSTRGrounds={editedSTRGrounds}
        setEditedSTRGrounds={setEditedSTRGrounds}
        canConfirm={canConfirm}
        onConfirm={handleConfirmAttempt}
        error={error}
      />

      {(stage === 'CONFIRMING' || stage === 'SUBMITTING') && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.scanline} />
            
            {stage === 'CONFIRMING' ? (
              <div className={styles.confirmationBox}>
                <div className={styles.confirmHeader}>CONFIRM LEGAL ACTION</div>
                <div className={styles.confirmBody}>
                  YOU ARE ABOUT TO EXECUTE: <span className={styles.phosphorText}>{selectedDecision.label}</span>
                  <br /><br />
                  THIS ACTION IS IRREVERSIBLE AND WILL BE LOGGED AS A PERMANENT STATUTORY RECORD.
                </div>
                <div className={styles.confirmActions}>
                  <button className={styles.cancelBtn} onClick={() => resetWorkflow()}>CANCEL</button>
                  <button className={styles.executeBtn} onClick={submitDecision}>EXECUTE ACTION</button>
                </div>
              </div>
            ) : (
              <div className={styles.loadingBox}>
                <div className={styles.teletypeLoading}>{loadingText}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MLROWorkflow;
