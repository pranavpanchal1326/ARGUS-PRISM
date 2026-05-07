/**
 * ARGUS-PRISM · MLRO Decision Configuration
 * Defines legal actions, consequences, and validation rules for MLRO decisions.
 */

export const DECISION_APPROVE = {
  id: 'APPROVE_STR',
  label: 'APPROVE STR',
  legalAction: 'PMLA Section 12 — STR Submission to FIU-IND',
  consequence: 'This action is irreversible. The Suspicious Transaction Report will be submitted to the Financial Intelligence Unit India. Account restriction is maintained. Case status moves to INVESTIGATING.',
  requiresReason: true,
  minReasonLength: 20,
  reasonLabel: 'GROUNDS OF SUSPICION',
  reasonPlaceholder: 'State the basis for confirming suspicion of money laundering...',
  allowsSTREdit: true,
  irreversible: true,
  nextStatus: 'INVESTIGATING',
  auditEventType: 'MLRO_STR_APPROVED'
};

export const DECISION_REJECT = {
  id: 'REJECT_FALSE_POSITIVE',
  label: 'REJECT — FALSE POSITIVE',
  legalAction: 'Account Clearance — KYC Verified',
  consequence: 'Account restrictions will be lifted immediately. WarmthScore flagged as false positive. Case closed. Rejection reason permanently recorded.',
  requiresReason: true,
  requiresCategory: true,
  minReasonLength: 40,
  categories: [
    'LEGITIMATE NRI RETURNEE',
    'JAN DHAN GOVERNMENT TRANSFER',
    'FAMILY / BUSINESS MULTI-DEVICE',
    'LEGITIMATE DORMANT REACTIVATION',
    'OTHER'
  ],
  otherMinLength: 80,
  reasonLabel: 'REJECTION JUSTIFICATION',
  reasonPlaceholder: 'State why this account is not a mule account and why the WarmthScore signals were triggered legitimately...',
  allowsSTREdit: false,
  irreversible: false,
  nextStatus: 'CLOSED',
  auditEventType: 'MLRO_FALSE_POSITIVE_CONFIRMED'
};

export const DECISION_ESCALATE = {
  id: 'ESCALATE_CBI',
  label: 'ESCALATE — CBI',
  legalAction: 'SC Writ 03/2025 — CBI Primary Agency Activation',
  consequence: 'MAXIMUM SEVERITY ACTION. CBI Evidence Package will be dispatched immediately. FIU-IND STR filed. RBI notified. Case classified as ORGANISED CRIME EVENT. This action cannot be reversed.',
  requiresReason: true,
  minReasonLength: 60,
  reasonLabel: 'ESCALATION JUSTIFICATION',
  reasonPlaceholder: 'State why this case exceeds bank jurisdiction and requires CBI primary investigation...',
  allowsSTREdit: false,
  irreversible: true,
  nextStatus: 'ESCALATED',
  auditEventType: 'MLRO_CBI_ESCALATION'
};

export const DECISIONS = {
  APPROVE_STR: DECISION_APPROVE,
  REJECT_FALSE_POSITIVE: DECISION_REJECT,
  ESCALATE_CBI: DECISION_ESCALATE
};
