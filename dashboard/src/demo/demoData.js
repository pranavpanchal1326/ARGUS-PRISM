/* ─────────────────────────────────────────────────────────────
   PRISM DEMO DATA — Single source of truth for USE_MOCK = true
   Story: UBI-2026-DEMO-001 warms over 72 hours → recruiter
   detected → funds blocked → AutoSTR generated
   ───────────────────────────────────────────────────────────── */

export const DEMO_ACCOUNTS = [
  {
    account_id: 'UBI-2026-DEMO-001', name: 'Rajesh Kumar', branch: 'Muzaffarpur Main',
    account_type: 'Savings', kyc_status: 'PENDING_REVERIFICATION',
    warmth_score: 84, risk_level: 'IMMINENT', taint_score: 0, taint_origin: null,
    created_at: '2026-03-10T09:14:00Z', last_transaction: '2026-03-13T09:22:34Z',
    fri_score: 'LOW', device_count: 2, sim_swap_detected: true,
    signals_fired: [1, 2, 4, 5, 6],
    shap_breakdown: [
      { signal: 'Signal 4 — Dormant Reactivation', impact: 31.2, weight: 0.20 },
      { signal: 'Signal 2 — Device Fingerprint',   impact: 22.0, weight: 0.22 },
      { signal: 'Signal 5 — FRI Contradiction',    impact: 18.3, weight: 0.15 },
      { signal: 'Signal 1 — Test Credit Pattern',  impact: 11.5, weight: 0.18 },
      { signal: 'Signal 3 — Velocity Derivative',  impact:  9.2, weight: 0.15 },
      { signal: 'Signal 6 — SIM Swap Velocity',    impact:  6.1, weight: 0.10 },
    ],
    restriction_active: true, restriction_since: '2026-03-12T21:14:00Z',
    restriction_authority: 'RBI KYC Master Direction 2016 — Section 38',
  },
  {
    account_id: 'UBI-2026-DEMO-002', name: 'Priya Sharma', branch: 'Patna Central',
    account_type: 'Savings', kyc_status: 'PENDING_REVERIFICATION',
    warmth_score: 76, risk_level: 'CRITICAL', taint_score: 80,
    taint_origin: 'UBI-2026-CONF-2025-0041',
    created_at: '2026-03-09T14:30:00Z', last_transaction: '2026-03-13T08:45:00Z',
    fri_score: 'LOW', device_count: 2, sim_swap_detected: false,
    signals_fired: [1, 2, 5],
    shap_breakdown: [
      { signal: 'Signal 2 — Device Fingerprint',   impact: 28.4, weight: 0.22 },
      { signal: 'Signal 1 — Test Credit Pattern',  impact: 24.1, weight: 0.18 },
      { signal: 'Signal 5 — FRI Contradiction',    impact: 16.2, weight: 0.15 },
      { signal: 'Signal 3 — Velocity Derivative',  impact:  8.1, weight: 0.15 },
      { signal: 'Signal 4 — Dormant Reactivation', impact:    0, weight: 0.20 },
      { signal: 'Signal 6 — SIM Swap Velocity',    impact:    0, weight: 0.10 },
    ],
    restriction_active: false, restriction_since: null, restriction_authority: null,
  },
  {
    account_id: 'UBI-2026-DEMO-003', name: 'Amit Verma', branch: 'Varanasi East',
    account_type: 'Jan Dhan', kyc_status: 'ACTIVE',
    warmth_score: 62, risk_level: 'HOT', taint_score: 55,
    taint_origin: 'UBI-2026-CONF-2025-0041',
    created_at: '2026-03-08T11:00:00Z', last_transaction: '2026-03-13T07:30:00Z',
    fri_score: 'MEDIUM', device_count: 1, sim_swap_detected: false,
    signals_fired: [1, 3],
    shap_breakdown: [
      { signal: 'Signal 1 — Test Credit Pattern',  impact: 22.0, weight: 0.18 },
      { signal: 'Signal 3 — Velocity Derivative',  impact: 18.5, weight: 0.15 },
      { signal: 'Signal 2 — Device Fingerprint',   impact: 12.0, weight: 0.22 },
      { signal: 'Signal 5 — FRI Contradiction',    impact:  6.0, weight: 0.15 },
      { signal: 'Signal 4 — Dormant Reactivation', impact:    0, weight: 0.20 },
      { signal: 'Signal 6 — SIM Swap Velocity',    impact:    0, weight: 0.10 },
    ],
    restriction_active: false, restriction_since: null, restriction_authority: null,
  },
  {
    account_id: 'UBI-2026-DEMO-004', name: 'Sunita Devi', branch: 'Gorakhpur North',
    account_type: 'Savings', kyc_status: 'ACTIVE',
    warmth_score: 44, risk_level: 'WARMING', taint_score: 30,
    taint_origin: 'UBI-2026-CONF-2025-0041',
    created_at: '2026-03-07T16:20:00Z', last_transaction: '2026-03-12T19:00:00Z',
    fri_score: 'LOW', device_count: 1, sim_swap_detected: false,
    signals_fired: [1],
    shap_breakdown: [
      { signal: 'Signal 1 — Test Credit Pattern',  impact: 14.0, weight: 0.18 },
      { signal: 'Signal 2 — Device Fingerprint',   impact:  8.0, weight: 0.22 },
      { signal: 'Signal 3 — Velocity Derivative',  impact:  4.0, weight: 0.15 },
      { signal: 'Signal 4 — Dormant Reactivation', impact:    0, weight: 0.20 },
      { signal: 'Signal 5 — FRI Contradiction',    impact:    0, weight: 0.15 },
      { signal: 'Signal 6 — SIM Swap Velocity',    impact:    0, weight: 0.10 },
    ],
    restriction_active: false, restriction_since: null, restriction_authority: null,
  },
  {
    account_id: 'UBI-2026-DEMO-005', name: 'Mohan Tiwari', branch: 'Lucknow West',
    account_type: 'Savings', kyc_status: 'ACTIVE',
    warmth_score: 28, risk_level: 'CLEAN', taint_score: 15,
    taint_origin: 'UBI-2026-CONF-2025-0041',
    created_at: '2026-03-06T10:00:00Z', last_transaction: '2026-03-11T14:00:00Z',
    fri_score: 'LOW', device_count: 1, sim_swap_detected: false,
    signals_fired: [],
    shap_breakdown: [
      { signal: 'Signal 1 — Test Credit Pattern',  impact: 4.0, weight: 0.18 },
      { signal: 'Signal 2 — Device Fingerprint',   impact: 3.0, weight: 0.22 },
      { signal: 'Signal 3 — Velocity Derivative',  impact: 2.0, weight: 0.15 },
      { signal: 'Signal 4 — Dormant Reactivation', impact:   0, weight: 0.20 },
      { signal: 'Signal 5 — FRI Contradiction',    impact:   0, weight: 0.15 },
      { signal: 'Signal 6 — SIM Swap Velocity',    impact:   0, weight: 0.10 },
    ],
    restriction_active: false, restriction_since: null, restriction_authority: null,
  },
  {
    account_id: 'UBI-2026-REC-001', name: '[RECRUITER NODE]',
    branch: 'Unknown — Prepaid SIM', account_type: 'Unknown',
    kyc_status: 'FROZEN', warmth_score: 15, risk_level: 'CLEAN',
    taint_score: 0, taint_origin: null,
    created_at: '2026-03-05T08:00:00Z', last_transaction: '2026-03-13T06:00:00Z',
    fri_score: 'LOW', device_count: 1, sim_swap_detected: false,
    signals_fired: [], shap_breakdown: [],
    restriction_active: true, restriction_since: '2026-03-13T06:30:00Z',
    restriction_authority: 'Recruiter Node — Campaign-Level Freeze',
    is_recruiter: true,
  },
];

export const DEMO_ALERTS = [
  {
    alert_id: 'ALT-001', account_id: 'UBI-2026-DEMO-001', account_name: 'Rajesh Kumar',
    alert_type: 'WARMTH_THRESHOLD', severity: 'IMMINENT', score: 84,
    top_signal: 'Signal 4 — Dormant Reactivation', second_signal: 'Signal 2 — Device Fingerprint',
    time_since_first_signal: '71 hours', taint_indicator: false,
    acknowledged: false, created_at: '2026-03-13T08:14:00Z',
  },
  {
    alert_id: 'ALT-002', account_id: 'UBI-2026-DEMO-002', account_name: 'Priya Sharma',
    alert_type: 'TAINT_HIT', severity: 'CRITICAL', score: 76,
    top_signal: 'Signal 2 — Device Fingerprint', second_signal: 'Signal 1 — Test Credit Pattern',
    time_since_first_signal: '48 hours', taint_indicator: true,
    acknowledged: false, created_at: '2026-03-13T07:30:00Z',
  },
  {
    alert_id: 'ALT-003', account_id: 'UBI-2026-DEMO-003', account_name: 'Amit Verma',
    alert_type: 'WARMTH_THRESHOLD', severity: 'HOT', score: 62,
    top_signal: 'Signal 1 — Test Credit Pattern', second_signal: 'Signal 3 — Velocity Derivative',
    time_since_first_signal: '36 hours', taint_indicator: true,
    acknowledged: false, created_at: '2026-03-13T06:00:00Z',
  },
  {
    alert_id: 'ALT-004', account_id: 'UBI-2026-DEMO-004', account_name: 'Sunita Devi',
    alert_type: 'WARMTH_THRESHOLD', severity: 'WARMING', score: 44,
    top_signal: 'Signal 1 — Test Credit Pattern', second_signal: null,
    time_since_first_signal: '24 hours', taint_indicator: true,
    acknowledged: false, created_at: '2026-03-13T04:00:00Z',
  },
];

export const DEMO_WARMTH_TIMELINE = {
  'UBI-2026-DEMO-001': [
    { hour:  0, timestamp: '2026-03-10T09:14:00Z', score: 21, signals_active: [],         event: 'Account created',                                           legal_action: null },
    { hour:  6, timestamp: '2026-03-10T15:14:00Z', score: 24, signals_active: [],         event: null,                                                        legal_action: null },
    { hour: 12, timestamp: '2026-03-10T21:14:00Z', score: 29, signals_active: [1],        event: 'Signal 1 partial — first micro-credit ₹200',                legal_action: null },
    { hour: 18, timestamp: '2026-03-11T03:14:00Z', score: 33, signals_active: [1],        event: null,                                                        legal_action: null },
    { hour: 24, timestamp: '2026-03-11T09:14:00Z', score: 41, signals_active: [1, 2],     event: 'Signal 2 fires — Device B registered, 3 IMEI prefix matches', legal_action: 'Internal WARMING flag — no customer impact' },
    { hour: 30, timestamp: '2026-03-11T15:14:00Z', score: 48, signals_active: [1, 2],     event: null,                                                        legal_action: null },
    { hour: 36, timestamp: '2026-03-11T21:14:00Z', score: 54, signals_active: [1, 2, 3], event: 'Signal 3 fires — velocity convexity detected',               legal_action: null },
    { hour: 42, timestamp: '2026-03-12T03:14:00Z', score: 58, signals_active: [1, 2, 3], event: null,                                                        legal_action: null },
    { hour: 48, timestamp: '2026-03-12T09:14:00Z', score: 67, signals_active: [1,2,3,4,5], event: 'Signal 4 + 5 fire — dormant reactivation + FRI contradiction', legal_action: 'KYC re-verification initiated — RBI KYC MD S.38' },
    { hour: 54, timestamp: '2026-03-12T15:14:00Z', score: 72, signals_active: [1,2,3,4,5], event: null,                                                      legal_action: null },
    { hour: 60, timestamp: '2026-03-12T21:14:00Z', score: 77, signals_active: [1,2,3,4,5,6], event: 'Signal 6 fires — SIM swap detected via DoT DIP',        legal_action: 'Outbound UPI RESTRICTED — RBI KYC MD S.38' },
    { hour: 66, timestamp: '2026-03-13T03:14:00Z', score: 81, signals_active: [1,2,3,4,5,6], event: null,                                                    legal_action: null },
    { hour: 72, timestamp: '2026-03-13T09:14:00Z', score: 84, signals_active: [1,2,3,4,5,6], event: 'FlowGraph confirms — ₹8,50,000 illicit credit BLOCKED', legal_action: 'AutoSTR initiated — PMLA S.12 + SC Writ 03/2025' },
  ],
};

export const DEMO_FLOWGRAPH = {
  nodes: [
    { id: 'UBI-2026-DEMO-001', label: 'Rajesh Kumar',  score: 84, type: 'mule',      x: 400, y: 250 },
    { id: 'UBI-2026-DEMO-002', label: 'Priya Sharma',  score: 76, type: 'mule',      x: 600, y: 150 },
    { id: 'UBI-2026-DEMO-003', label: 'Amit Verma',    score: 62, type: 'mule',      x: 600, y: 350 },
    { id: 'UBI-2026-DEMO-004', label: 'Sunita Devi',   score: 44, type: 'mule',      x: 750, y: 100 },
    { id: 'UBI-2026-DEMO-005', label: 'Mohan Tiwari',  score: 28, type: 'mule',      x: 750, y: 400 },
    { id: 'UBI-2026-REC-001',  label: 'RECRUITER',     score: 15, type: 'recruiter', x: 150, y: 250 },
    { id: 'EXT-SOURCE-001',    label: 'Unknown Source', score:  0, type: 'external',  x: 400, y:  50 },
  ],
  edges: [
    { from: 'UBI-2026-REC-001',  to: 'UBI-2026-DEMO-001', amount: 350,    type: 'test_credit',    timestamp: '2026-03-10T12:00:00Z' },
    { from: 'UBI-2026-REC-001',  to: 'UBI-2026-DEMO-002', amount: 200,    type: 'test_credit',    timestamp: '2026-03-09T16:00:00Z' },
    { from: 'UBI-2026-REC-001',  to: 'UBI-2026-DEMO-003', amount: 150,    type: 'test_credit',    timestamp: '2026-03-08T13:00:00Z' },
    { from: 'UBI-2026-REC-001',  to: 'UBI-2026-DEMO-004', amount: 250,    type: 'test_credit',    timestamp: '2026-03-07T18:00:00Z' },
    { from: 'UBI-2026-REC-001',  to: 'UBI-2026-DEMO-005', amount: 100,    type: 'test_credit',    timestamp: '2026-03-06T11:00:00Z' },
    { from: 'EXT-SOURCE-001',    to: 'UBI-2026-DEMO-001', amount: 850000, type: 'illicit_credit',  timestamp: '2026-03-13T09:22:00Z' },
    { from: 'UBI-2026-DEMO-001', to: 'UBI-2026-DEMO-002', amount: 420000, type: 'layering',       timestamp: '2026-03-13T09:22:34Z' },
    { from: 'UBI-2026-DEMO-002', to: 'UBI-2026-DEMO-003', amount: 210000, type: 'layering',       timestamp: '2026-03-13T09:23:00Z' },
  ],
};

export const DEMO_RECRUITER_DATA = {
  recruiters: [
    {
      recruiter_id: 'UBI-2026-REC-001',
      classification: 'CAMPAIGN_COORDINATOR',
      downstream_count: 5, frozen_count: 1, active_count: 4,
      test_payments_48h: 5, total_test_amount: 1050,
      first_detected: '2026-03-13T06:00:00Z',
      downstream_accounts: ['UBI-2026-DEMO-001','UBI-2026-DEMO-002','UBI-2026-DEMO-003','UBI-2026-DEMO-004','UBI-2026-DEMO-005'],
    },
  ],
};

export const DEMO_AUTOSTR_CASES = [
  {
    case_id: 'CASE-9912', account_id: 'UBI-2026-DEMO-001', account_name: 'Rajesh Kumar',
    warmth_score: 84, status: 'GENERATED', generated_at: '2026-03-13T10:09:47Z',
    generation_time_seconds: 47.3,
    packages: {
      fiu_ind: {
        status: 'COMPLETE',
        sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        legal_basis: 'PMLA Section 12', filename: 'PRISM_STR_CASE9912_FIU.xml', size_kb: 42,
      },
      cbi_package: {
        status: 'COMPLETE',
        sha256: 'e5f6c7d8e9f0e5f6c7d8e9f0e5f6c7d8e9f0e5f6c7d8e9f0e5f6c7d8e9f0e5f6',
        legal_basis: 'SC Writ 03/2025', filename: 'PRISM_CBI_CASE9912.pdf', size_kb: 318,
      },
      rbi_report: {
        status: 'COMPLETE',
        sha256: 'a9b0c1d2e3f4a9b0c1d2e3f4a9b0c1d2e3f4a9b0c1d2e3f4a9b0c1d2e3f4a9b0',
        legal_basis: 'RBI Cyber Security Framework', filename: 'PRISM_RBI_CASE9912.json', size_kb: 18,
      },
    },
    mlro_status: 'PENDING_APPROVAL',
  },
];

export const DEMO_KPI_STATS = {
  critical_threats: 1,    critical_delta: '+1 in last 6h',
  avg_warmth_score: 61.4, avg_delta: '+8.2 from yesterday',
  strs_generated: 1,      str_delta: 'Last: 47 min ago',
  accounts_monitored: 6,  recruiters_detected: 1,
};

export const DEMO_HEALTH = {
  postgres:  { status: 'ok', latency_ms:  2 },
  neo4j:     { status: 'ok', latency_ms:  8 },
  redis:     { status: 'ok', latency_ms:  1 },
  kafka:     { status: 'ok', latency_ms: 14 },
  ml_model:  { status: 'ok', latency_ms: 23 },
};
