/**
 * ARGUS-PRISM · AutoSTR Configuration
 * Defines evidence packages, legal mandates, and generation feed sequences.
 */

export const PACKAGES = [
  {
    id: 'FIU_STR',
    index: 1,
    name: 'FIU-IND STR',
    recipient: 'FINANCIAL INTELLIGENCE UNIT INDIA',
    format: 'SAPTRN + SAPINP + SAPLEP + SAPPIT XML',
    legalMandate: 'PMLA Section 12',
    mandateDetail: 'Mandatory STR within 7 days of suspicion',
    previousTime: '3–7 DAYS MANUAL',
    prismTime: '< 60 MINUTES',
    downloadLabel: 'DOWNLOAD STR XML',
    downloadExtension: '.xml',
    mimeType: 'application/xml',
    hasXMLPreview: true,
    generationSteps: 20,
    estimatedMs: 12000
  },
  {
    id: 'CBI_PACKAGE',
    index: 2,
    name: 'CBI EVIDENCE PACKAGE',
    recipient: 'CENTRAL BUREAU OF INVESTIGATION',
    format: 'STRUCTURED PDF · TRANSACTION LINEAGE · DEVICE TIMELINE · NETWORK GRAPH',
    legalMandate: 'SC Writ 03/2025',
    mandateDetail: 'CBI primary agency — digital arrest fraud',
    previousTime: 'NOT SYSTEMATICALLY PRODUCED',
    prismTime: 'AUTO-GENERATED AT SCORE 85+',
    downloadLabel: 'DOWNLOAD CBI PACKAGE',
    downloadExtension: '.pdf',
    mimeType: 'application/pdf',
    hasXMLPreview: false,
    hasSectionPreview: true,
    generationSteps: 20,
    estimatedMs: 18000
  },
  {
    id: 'RBI_REPORT',
    index: 3,
    name: 'RBI REGULATORY REPORT',
    recipient: 'RESERVE BANK OF INDIA',
    format: 'AGGREGATE FRAUD INTELLIGENCE · RBI FORMAT',
    legalMandate: 'RBI Cyber Security Framework',
    mandateDetail: 'Compulsory fraud event reporting',
    previousTime: 'QUARTERLY MANUAL',
    prismTime: 'REAL-TIME EVENT-DRIVEN',
    downloadLabel: 'DOWNLOAD RBI REPORT',
    downloadExtension: '.json',
    mimeType: 'application/json',
    hasXMLPreview: false,
    hasFieldPreview: true,
    generationSteps: 20,
    estimatedMs: 8000
  }
];

export const FEED_MESSAGES = {
  FIU_STR: [
    'SAPTRN NODE INITIALISED · ACCOUNT BINDING COMPLETE',
    'TRANSACTION RECORDS FETCHED · 14 EVENTS INDEXED',
    'SAPINP POPULATED · INSTITUTION CODE VERIFIED',
    'SUSPICIOUS PATTERN FLAGGED · LAYERING DEPTH: 4',
    'SAPLEP FIELDS MAPPED · LEGAL ENTITY PROFILE SET',
    'SAPPIT POPULATED · TRANSACTION AMOUNTS VERIFIED',
    'XML SCHEMA VALIDATION · PASS',
    'FIU-IND SUBMISSION ENDPOINT RESOLVED',
    'DIGITAL SIGNATURE APPLIED · SHA-256 HASH GENERATED',
    'FIU-IND STR PACKAGE COMPLETE · AWAITING MLRO APPROVAL'
  ],
  CBI_PACKAGE: [
    'TRANSACTION LINEAGE TRACED · 4 HOPS · 6 ACCOUNTS',
    'DEVICE TIMELINE COMPILED · 3 DEVICE EVENTS LOGGED',
    'FLOWGRAPH SNAPSHOT CAPTURED · NODE COUNT: 14',
    'WITNESS ACCOUNTS IDENTIFIED · 8 CONNECTED NODES',
    'CBI EVIDENCE PDF · PAGE 1 OF 7 · COVER SHEET',
    'CBI EVIDENCE PDF · PAGE 3 OF 7 · TXN LINEAGE',
    'CBI EVIDENCE PDF · PAGE 5 OF 7 · DEVICE EVENTS',
    'CBI EVIDENCE PDF · PAGE 7 OF 7 · NETWORK GRAPH',
    'SC WRIT 03/2025 MANDATE FIELD · POPULATED',
    'CBI EVIDENCE PACKAGE COMPLETE · 7 PAGES · SIGNED'
  ],
  RBI_REPORT: [
    'FRAUD EVENT CLASSIFICATION · MULE NETWORK DETECTED',
    'AGGREGATE LOSS CALCULATION · IN PROGRESS',
    'CHANNEL BREAKDOWN · UPI · NEFT · IMPS MAPPED',
    'ACCOUNT CATEGORY TAGGED · PSB · RETAIL',
    'RECRUITMENT PATTERN LOGGED · COORDINATOR IDENTIFIED',
    'FY26 H1 CONTRIBUTION FIELD · UPDATED',
    'RBI PRESCRIBED FORMAT · VALIDATION PASS',
    'REGULATORY SUBMISSION ENDPOINT · RESOLVED',
    'DIGITAL SUBMISSION PAYLOAD · ASSEMBLED',
    'RBI REGULATORY REPORT COMPLETE · REAL-TIME'
  ]
};
