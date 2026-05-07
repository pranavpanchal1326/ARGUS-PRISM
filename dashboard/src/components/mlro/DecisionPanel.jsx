import React, { useRef, useEffect } from 'react';
import { DECISIONS } from './mlroDecisionConfig';
import styles from './DecisionPanel.module.css';

const DecisionPanel = ({ 
  stage,
  selectedDecision,
  onSelect,
  accountId,
  warmthScore,
  mlroId,
  reason,
  setReason,
  selectedCategory,
  setSelectedCategory,
  editedSTRGrounds,
  setEditedSTRGrounds,
  canConfirm,
  onConfirm,
  error
}) => {
  const pulseRef = useRef(null);

  useEffect(() => {
    if (selectedDecision?.id === 'ESCALATE_CBI') {
      let on = false;
      pulseRef.current = setInterval(() => {
        on = !on;
        const btn = document.getElementById('escalate-btn');
        if (btn) btn.style.boxShadow = on ? '0 0 0 3px #B8FF6B' : '0 0 0 1px #B8FF6B';
      }, 1000);
    } else {
      clearInterval(pulseRef.current);
    }
    return () => clearInterval(pulseRef.current);
  }, [selectedDecision]);

  const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false }) + ' IST';

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.uiText}>MLRO REVIEW REQUIRED</span>
          <span className={styles.monoText}>CASE-UBI-2026-0847</span>
        </div>
        <div className={styles.divider} />
      </header>

      <div className={styles.metadataArea}>
        <div className={styles.metaRow}>
          <span className={styles.label}>ACCOUNT</span>
          <span className={styles.monoValue}>{accountId}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.label}>SCORE</span>
          <span className={styles.scoreValue}>{warmthScore}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.label}>REVIEWED BY</span>
          <span className={styles.monoValue}>{mlroId} · {timestamp}</span>
        </div>
      </div>

      <div className={styles.divider} />

      <section className={styles.decisionArea}>
        <div className={styles.uiText} style={{ marginBottom: '16px' }}>SELECT DECISION</div>
        
        <div className={styles.buttonGrid}>
          <button 
            className={`${styles.decisionBtn} ${selectedDecision?.id === 'APPROVE_STR' ? styles.btnApproveActive : ''}`}
            onClick={() => onSelect(DECISIONS.APPROVE_STR)}
          >
            <div className={styles.btnLabel}>APPROVE STR</div>
            <div className={styles.btnSub}>PMLA S.12</div>
          </button>

          <button 
            className={`${styles.decisionBtn} ${selectedDecision?.id === 'REJECT_FALSE_POSITIVE' ? styles.btnRejectActive : ''}`}
            onClick={() => onSelect(DECISIONS.REJECT_FALSE_POSITIVE)}
          >
            <div className={styles.btnLabel}>REJECT</div>
            <div className={styles.btnSub}>FALSE POSITIVE</div>
          </button>

          <button 
            id="escalate-btn"
            className={`${styles.decisionBtn} ${selectedDecision?.id === 'ESCALATE_CBI' ? styles.btnEscalateActive : ''}`}
            onClick={() => onSelect(DECISIONS.ESCALATE_CBI)}
          >
            <div className={styles.btnLabel}>ESCALATE</div>
            <div className={styles.btnSub}>CBI</div>
          </button>
        </div>
      </section>

      {selectedDecision && (
        <section className={styles.reasonArea}>
          <div className={styles.scanline} />
          
          <div className={styles.consequenceBox}>
            <div className={styles.monoText} style={{ fontSize: '11px', color: 'var(--instrument-grey)' }}>
              {selectedDecision.consequence}
            </div>
          </div>

          {selectedDecision.id === 'REJECT_FALSE_POSITIVE' && (
            <div className={styles.categoryPills}>
              {selectedDecision.categories.map(cat => (
                <div 
                  key={cat}
                  className={`${styles.pill} ${selectedCategory === cat ? styles.pillActive : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </div>
              ))}
            </div>
          )}

          <div className={styles.fieldWrapper}>
            <label className={styles.fieldLabel}>{selectedDecision.reasonLabel}</label>
            <textarea 
              className={styles.textarea}
              placeholder={selectedDecision.reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className={`${styles.charCounter} ${reason.length >= selectedDecision.minReasonLength ? styles.charMet : ''}`}>
              {reason.length} / {selectedDecision.id === 'REJECT_FALSE_POSITIVE' && selectedCategory === 'OTHER' ? selectedDecision.otherMinLength : selectedDecision.minReasonLength} MINIMUM
            </div>
          </div>

          {selectedDecision.allowsSTREdit && (
            <div className={styles.fieldWrapper} style={{ marginTop: '24px' }}>
              <label className={styles.fieldLabel}>GROUNDS OF SUSPICION — EDITABLE</label>
              <textarea 
                className={styles.textarea}
                value={editedSTRGrounds}
                onChange={(e) => setEditedSTRGrounds(e.target.value)}
              />
              <div className={styles.monoText} style={{ fontSize: '9px', color: 'var(--instrument-grey)', marginTop: '4px' }}>
                THIS TEXT WILL BE SUBMITTED TO FIU-IND AS THE OFFICIAL GROUNDS OF SUSPICION
              </div>
            </div>
          )}

          {error && (
            <div className={styles.errorBox}>
              SUBMISSION FAILED · {error}
            </div>
          )}

          <div className={styles.footer}>
            {selectedDecision.irreversible && (
              <div className={styles.warningText}>
                ⚠ THIS ACTION IS IRREVERSIBLE AND CREATES AN IMMUTABLE AUDIT RECORD
              </div>
            )}
            <button 
              className={`${styles.confirmBtn} ${styles['confirmBtn--' + selectedDecision.id.split('_')[0]]}`}
              style={{ 
                opacity: canConfirm ? 1 : 0.3,
                pointerEvents: canConfirm ? 'auto' : 'none'
              }}
              onClick={onConfirm}
            >
              CONFIRM {selectedDecision.label}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default DecisionPanel;
