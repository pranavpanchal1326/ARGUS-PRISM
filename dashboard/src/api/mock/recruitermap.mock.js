/**
 * Mock data for Panel 04: Recruiter Map.
 * Shows two clusters: one Coordinator and one Orchestrator.
 */

export const mockRecruiterMap = {
  generated_at: "2026-03-15T14:47:23Z",
  bank_id: "UNION_BANK_OF_INDIA",
  summary: {
    total_recruiters: 2,
    total_warming_accounts: 31,
    total_at_risk_estimate: 28500000,
    campaign_scale_max: "ORCHESTRATOR",
    campaign_started_at: "2026-03-13T18:22:00Z"
  },
  recruiters: [
    {
      id: "r1",
      account_id: "UBI-2026-RECR-001",
      label: "RECR-001",
      node_type: "RECRUITER",
      campaign_scale: "COORDINATOR",
      warming_account_count: 9,
      warmth_score: 18,
      total_test_payments_48h: 1350,
      first_test_payment_at: "2026-03-13T18:22:00Z",
      account_age_days: 312,
      is_frozen: false,
      respiration_hz: 1.2
    },
    {
      id: "r2",
      account_id: "UBI-2026-RECR-002",
      label: "RECR-002",
      node_type: "RECRUITER",
      campaign_scale: "ORCHESTRATOR",
      warming_account_count: 23,
      warmth_score: 22,
      total_test_payments_48h: 3680,
      first_test_payment_at: "2026-03-14T09:12:00Z",
      account_age_days: 410,
      is_frozen: false,
      respiration_hz: 2.0
    }
  ],
  warming_accounts: [
    // Coordinator cluster (r1)
    ...Array.from({ length: 9 }).map((_, i) => ({
      id: `w1-${i}`,
      account_id: i === 0 ? "UBI-2026-DEMO-001" : `UBI-2026-WARM-10${i}`,
      label: i === 0 ? "DEMO-001" : `WARM-10${i}`,
      node_type: "WARMING_TARGET",
      warmth_score: i === 0 ? 87 : (20 + i * 8),
      severity: i === 0 ? "IMMINENT" : (i < 4 ? "HOT" : (i < 7 ? "CRITICAL" : "WARMING")),
      recruiter_id: "r1",
      test_payment_amount: 150,
      test_payment_at: "2026-03-13T19:00:00Z",
      hours_since_test_payment: 47
    })),
    // Orchestrator cluster (r2)
    ...Array.from({ length: 23 }).map((_, i) => ({
      id: `w2-${i}`,
      account_id: `UBI-2026-WARM-20${i}`,
      label: `WARM-20${i}`,
      node_type: "WARMING_TARGET",
      warmth_score: (15 + i * 3),
      severity: i < 5 ? "HOT" : (i < 12 ? "CRITICAL" : "WARMING"),
      recruiter_id: "r2",
      test_payment_amount: 160,
      test_payment_at: "2026-03-14T10:00:00Z",
      hours_since_test_payment: 36
    })),
    // Shared Target (overrides one from r2)
    {
      id: "w-shared",
      account_id: "UBI-2026-SHRD-999",
      label: "SHRD-999",
      node_type: "WARMING_TARGET",
      warmth_score: 78,
      severity: "CRITICAL",
      recruiter_id: "r1", // primary link
      secondary_recruiter_id: "r2",
      test_payment_amount: 200,
      test_payment_at: "2026-03-14T15:00:00Z",
      hours_since_test_payment: 30,
      is_shared: true
    }
  ],
  edges: [] // Generated in component for convenience or here
};

// Generate edges for recruiters to their warming accounts
mockRecruiterMap.edges = mockRecruiterMap.warming_accounts.map(w => ({
  id: `e-${w.recruiter_id}-${w.id}`,
  source: w.recruiter_id,
  target: w.id,
  amount: w.test_payment_amount,
  timestamp: w.test_payment_at,
  edge_type: "TEST_PAYMENT"
}));

// Add secondary edge for shared
mockRecruiterMap.edges.push({
  id: `e-r2-shared`,
  source: "r2",
  target: "w-shared",
  amount: 200,
  timestamp: "2026-03-14T15:05:00Z",
  edge_type: "TEST_PAYMENT"
});
