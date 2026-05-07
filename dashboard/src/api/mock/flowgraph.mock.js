/**
 * Canonical 11-node fraud network for Panel 03.
 * Patterns: Layering, Round-tripping, Recruiter Identification.
 */

export const mockFlowGraph = {
  account_id: "UBI-2026-DEMO-001",
  generated_at: "2026-03-15T14:47:23Z",
  total_at_risk: 1650000,
  recruiter_node_id: "n2",
  detected_patterns: ["LAYERING", "ROUND_TRIP", "RECRUITER_IDENTIFIED"],
  nodes: [
    {
      id: "n1",
      account_id: "UBI-2026-DEMO-001",
      label: "DEMO-001",
      node_type: "SELECTED",
      warmth_score: 87,
      severity: "IMMINENT",
      taint_score: 0,
      account_age_days: 3,
      declared_profile: "STUDENT",
      transaction_volume_48h: 1650000,
      is_frozen: true,
      freeze_reason: "KYC_RESTRICTION"
    },
    {
      id: "n2",
      account_id: "UBI-2026-RECR-001",
      label: "RECR-001",
      node_type: "RECRUITER",
      warmth_score: 18,
      severity: "CLEAN",
      taint_score: 0,
      account_age_days: 312,
      declared_profile: "SMALL BUSINESS",
      transaction_volume_48h: 4800,
      is_frozen: false,
      freeze_reason: null
    },
    {
      id: "n3",
      account_id: "UBI-2026-LAYR-001",
      label: "LAYR-001",
      node_type: "MULE",
      warmth_score: 71,
      severity: "HOT",
      taint_score: 0,
      account_age_days: 5,
      declared_profile: "SALARIED",
      transaction_volume_48h: 790000,
      is_frozen: false,
      freeze_reason: null
    },
    {
      id: "n4",
      account_id: "UBI-2026-LAYR-002",
      label: "LAYR-002",
      node_type: "MULE",
      warmth_score: 79,
      severity: "CRITICAL",
      taint_score: 0,
      account_age_days: 4,
      declared_profile: "VEGETABLE VENDOR",
      transaction_volume_48h: 780000,
      is_frozen: false,
      freeze_reason: null
    },
    {
      id: "n5",
      account_id: "UBI-2026-LAYR-003",
      label: "LAYR-003",
      node_type: "MULE",
      warmth_score: 76,
      severity: "CRITICAL",
      taint_score: 0,
      account_age_days: 4,
      declared_profile: "STUDENT",
      transaction_volume_48h: 770000,
      is_frozen: false,
      freeze_reason: null
    },
    {
      id: "n6",
      account_id: "UBI-2026-TRIP-001",
      label: "TRIP-001",
      node_type: "MULE",
      warmth_score: 68,
      severity: "HOT",
      taint_score: 0,
      account_age_days: 12,
      declared_profile: "SALARIED",
      transaction_volume_48h: 500000,
      is_frozen: false,
      freeze_reason: null
    },
    {
      id: "n7",
      account_id: "UBI-2025-TNTD-001",
      label: "TNTD-001",
      node_type: "TAINTED",
      warmth_score: 12,
      severity: "CLEAN",
      taint_score: 75,
      account_age_days: 410,
      declared_profile: "RETIRED",
      transaction_volume_48h: 0,
      is_frozen: false,
      freeze_reason: null
    },
    {
      id: "n8",
      account_id: "UBI-2025-TNTD-002",
      label: "TNTD-002",
      node_type: "TAINTED",
      warmth_score: 8,
      severity: "CLEAN",
      taint_score: 55,
      account_age_days: 390,
      declared_profile: "VEGETABLE VENDOR",
      transaction_volume_48h: 0,
      is_frozen: false,
      freeze_reason: null
    },
    {
      id: "n9",
      account_id: "UBI-2026-CLEN-001",
      label: "CLEN-001",
      node_type: "CLEAN",
      warmth_score: 22,
      severity: "CLEAN",
      taint_score: 0,
      account_age_days: 80,
      declared_profile: "STUDENT",
      transaction_volume_48h: 1200,
      is_frozen: false,
      freeze_reason: null
    },
    {
      id: "n10",
      account_id: "UBI-2026-CLEN-002",
      label: "CLEN-002",
      node_type: "CLEAN",
      warmth_score: 15,
      severity: "CLEAN",
      taint_score: 0,
      account_age_days: 120,
      declared_profile: "SALARIED",
      transaction_volume_48h: 500,
      is_frozen: false,
      freeze_reason: null
    },
    {
      id: "n11",
      account_id: "UBI-2026-WARM-001",
      label: "WARM-001",
      node_type: "MULE",
      warmth_score: 44,
      severity: "WARMING",
      taint_score: 0,
      account_age_days: 6,
      declared_profile: "STUDENT",
      transaction_volume_48h: 150,
      is_frozen: false,
      freeze_reason: null
    },
    {
      id: "external",
      account_id: "EXTERNAL-SOURCE",
      label: "EXTERNAL",
      node_type: "EXTERNAL",
      warmth_score: 0,
      severity: "CLEAN",
      taint_score: 0,
      account_age_days: 0,
      declared_profile: "UNKNOWN SOURCE",
      transaction_volume_48h: 850000,
      is_frozen: false,
      freeze_reason: null
    }
  ],
  edges: [
    { id: "e1", source: "n2", target: "n1", amount: 200, channel: "UPI", edge_type: "TEST_CREDIT", hour_offset: 18, is_flagged: true },
    { id: "e2", source: "external", target: "n1", amount: 850000, channel: "NEFT", edge_type: "ILLICIT_CREDIT", hour_offset: 72, is_flagged: true },
    { id: "e3", source: "n1", target: "n3", amount: 790000, channel: "IMPS", edge_type: "LAYERING", hour_offset: 72.1, is_flagged: true },
    { id: "e4", source: "n3", target: "n4", amount: 780000, channel: "RTGS", edge_type: "LAYERING", hour_offset: 72.3, is_flagged: true },
    { id: "e5", source: "n4", target: "n5", amount: 770000, channel: "NEFT", edge_type: "LAYERING", hour_offset: 72.8, is_flagged: true },
    { id: "e6", source: "n5", target: "n6", amount: 600000, channel: "IMPS", edge_type: "ROUND_TRIP", hour_offset: 73.0, is_flagged: true },
    { id: "e7", source: "n6", target: "n1", amount: 500000, channel: "UPI", edge_type: "ROUND_TRIP", hour_offset: 73.5, is_flagged: true },
    { id: "e8", source: "n1", target: "n7", amount: 0, channel: "NONE", edge_type: "TAINT_LINK", hour_offset: 0, is_flagged: false },
    { id: "e9", source: "n1", target: "n8", amount: 0, channel: "NONE", edge_type: "TAINT_LINK", hour_offset: 0, is_flagged: false },
    { id: "e10", source: "n2", target: "n11", amount: 150, channel: "UPI", edge_type: "TEST_CREDIT", hour_offset: 20, is_flagged: true },
    { id: "e11", source: "n9", target: "n3", amount: 450000, channel: "IMPS", edge_type: "STRUCTURING", hour_offset: 72.5, is_flagged: true },
    { id: "e12", source: "n10", target: "n3", amount: 350000, channel: "NEFT", edge_type: "STRUCTURING", hour_offset: 72.6, is_flagged: true }
  ]
};

export const mockFlowGraphById = {
  "UBI-2026-DEMO-001": mockFlowGraph
};
