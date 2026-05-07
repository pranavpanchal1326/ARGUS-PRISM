import { useState, useCallback, useMemo } from 'react';

/**
 * State Machine stages:
 * IDLE → DECISION_SELECTED → REASON_ENTERED → CONFIRMING → SUBMITTING → CONFIRMED → ERROR
 */
export function useMLRODecision({ 
  caseId, 
  accountId, 
  warmthScore, 
  mlroId, 
  autoSTRGrounds, 
  onDecisionComplete 
}) {
  const [stage, setStage] = useState('IDLE');
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [reason, setReason] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editedSTRGrounds, setEditedSTRGrounds] = useState(autoSTRGrounds || '');
  const [auditRecord, setAuditRecord] = useState(null);
  const [error, setError] = useState(null);

  const selectDecision = useCallback((decisionConfig) => {
    setSelectedDecision(decisionConfig);
    setStage('DECISION_SELECTED');
    setReason('');
    setSelectedCategory(null);
    if (decisionConfig.id === 'APPROVE_STR') {
      setEditedSTRGrounds(autoSTRGrounds || '');
    }
  }, [autoSTRGrounds]);

  const isReasonValid = useMemo(() => {
    if (!selectedDecision) return false;
    
    let minLength = selectedDecision.minReasonLength;
    if (selectedDecision.id === 'REJECT_FALSE_POSITIVE' && selectedCategory === 'OTHER') {
      minLength = selectedDecision.otherMinLength;
    }
    
    const reasonMet = reason.length >= minLength;
    const categoryMet = selectedDecision.requiresCategory ? !!selectedCategory : true;
    
    return reasonMet && categoryMet;
  }, [selectedDecision, reason, selectedCategory]);

  const canConfirm = isReasonValid;

  const confirmDecision = useCallback(() => {
    if (canConfirm) setStage('CONFIRMING');
  }, [canConfirm]);

  const submitDecision = useCallback(async () => {
    setStage('SUBMITTING');
    setError(null);

    const payload = {
      caseId,
      accountId,
      decisionType: selectedDecision.id,
      mlroId,
      reason,
      category: selectedCategory || null,
      strGrounds: editedSTRGrounds || null,
      warmthScore,
      timestamp: new Date().toISOString(),
      auditEventType: selectedDecision.auditEventType
    };

    try {
      // Simulation of API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // 10% chance of failure for demo purposes or actual error handling
          if (Math.random() < 0.1) reject(new Error('NETWORK_TIMEOUT · REGULATORY_GATEWAY_UNREACHABLE'));
          else resolve({ auditId: 'AUDIT-' + Date.now().toString().slice(-8) });
        }, 1400);
      });

      const audit = {
        auditId: 'AUDIT-' + Date.now().toString().slice(-8),
        decisionType: selectedDecision.label,
        mlroId,
        timestamp: new Date().toISOString(),
        caseId,
        accountId,
        legalAction: selectedDecision.legalAction,
        nextStatus: selectedDecision.nextStatus
      };

      setAuditRecord(audit);
      setStage('CONFIRMED');
      
      if (onDecisionComplete) {
        onDecisionComplete(selectedDecision, audit);
      }
      
      console.log('[PRISM] Decision recorded successfully:', audit);
    } catch (err) {
      setError(err.message);
      setStage('ERROR');
    }
  }, [caseId, accountId, selectedDecision, mlroId, reason, selectedCategory, editedSTRGrounds, warmthScore, onDecisionComplete]);

  const resetWorkflow = useCallback(() => {
    setStage('IDLE');
    setSelectedDecision(null);
    setReason('');
    setSelectedCategory(null);
    setError(null);
    setAuditRecord(null);
  }, []);

  return {
    stage,
    selectedDecision,
    selectDecision,
    reason,
    setReason,
    selectedCategory,
    setSelectedCategory,
    editedSTRGrounds,
    setEditedSTRGrounds,
    isReasonValid,
    canConfirm,
    confirmDecision,
    submitDecision,
    resetWorkflow,
    auditRecord,
    error
  };
}
