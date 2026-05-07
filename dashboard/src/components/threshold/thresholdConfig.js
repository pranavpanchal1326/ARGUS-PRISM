/**
 * ARGUS-PRISM · Threshold Configuration
 * Defines legal thresholds and statutory authorities for account restrictions.
 */

export const THRESHOLD_75 = {
  score: 75,
  name: 'KYC RE-VERIFICATION INITIATED',
  legalBasis: 'RBI KYC Master Direction 2016 · Section 38',
  legalSummary: 'Bank authority to restrict account operations pending KYC re-verification. No court order required. Full statutory authority under RBI Cyber Security Framework.',
  actions: [
    'Outbound UPI restricted immediately',
    'Video KYC notification dispatched to customer',
    'Enhanced monitoring elevated to ACTIVE',
    'MLRO alert generated — review within 4 hours'
  ],
  customerImpact: 'Video KYC required · Resolved within 48 hours',
  mlroRequired: false,
  autoSTRTriggered: false,
  severity: 'WARNING'
};

export const THRESHOLD_85 = {
  score: 85,
  name: 'ACCOUNT RESTRICTION · AUTOSTR INITIATED',
  legalBasis: 'PMLA Section 12 · SC Writ 03/2025',
  legalSummary: 'Mandatory STR filing with FIU-IND within 7 days of suspicion. Supreme Court Writ 03/2025 mandates CBI Evidence Package generation. MLRO approval required before any restriction lifted.',
  actions: [
    'Full account restriction — all channels',
    'AutoSTR initiated — FIU-IND XML generation begun',
    'CBI Evidence Package generation begun',
    'RBI Regulatory Report queued',
    'MLRO escalation — mandatory immediate review'
  ],
  customerImpact: 'Full restriction · MLRO review within 24 hours',
  mlroRequired: true,
  autoSTRTriggered: true,
  severity: 'CRITICAL'
};

export const THRESHOLDS = {
  75: THRESHOLD_75,
  85: THRESHOLD_85
};
