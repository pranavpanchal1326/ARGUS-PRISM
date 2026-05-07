/**
 * Canonical 72-hour demo scenario for ARGUS-PRISM.
 * Account: UBI-2026-DEMO-001
 * Story: Account passes CLEAN -> WARMING -> HOT -> CRITICAL -> IMMINENT
 */

const generateDemoTimeline = () => {
  return [
    { hour: 0, score: 21, signal_fired: null, signal_number: null, event_label: null, event_detail: null, threshold_crossed: null },
    { hour: 12, score: 29, signal_fired: null, signal_number: null, event_label: null, event_detail: null, threshold_crossed: null },
    { hour: 18, score: 33, signal_fired: null, signal_number: null, event_label: null, event_detail: null, threshold_crossed: null },
    { hour: 24, score: 41, signal_fired: "Test Credit Pattern", signal_number: 1, event_label: "S1 · TEST CREDIT", event_detail: "Pattern of small credits detected", threshold_crossed: null },
    { hour: 30, score: 49, signal_fired: null, signal_number: null, event_label: null, event_detail: null, threshold_crossed: null },
    { hour: 36, score: 58, signal_fired: "Device Fingerprint Mismatch", signal_number: 2, event_label: "S2 · DEVICE MISMATCH", event_detail: "Inconsistent device identifiers", threshold_crossed: null },
    { hour: 42, score: 63, signal_fired: null, signal_number: null, event_label: null, event_detail: null, threshold_crossed: null },
    { hour: 48, score: 69, signal_fired: "Velocity Derivative Convexity", signal_number: 3, event_label: "S3 · VELOCITY CURVE", event_detail: "Rapid acceleration in transaction volume", threshold_crossed: null },
    { hour: 54, score: 72, signal_fired: null, signal_number: null, event_label: null, event_detail: null, threshold_crossed: null },
    { hour: 60, score: 77, signal_fired: null, signal_number: null, event_label: "KYC RESTRICTION", event_detail: "RBI KYC Master Direction S.38 triggered", threshold_crossed: "KYC_RESTRICTION" },
    { hour: 65, score: 79, signal_fired: null, signal_number: null, event_label: null, event_detail: null, threshold_crossed: null },
    { hour: 71, score: 84, signal_fired: "FRI Contradiction", signal_number: 5, event_label: "S5 · FRI CONTRADICTION", event_detail: "Clean FRI score inconsistent with behavioral data", threshold_crossed: null },
    { hour: 72, score: 87, signal_fired: "Dormant Reactivation", signal_number: 4, event_label: "S4 · REACTIVATION", event_detail: "Long-dormant account suddenly active", threshold_crossed: "AUTOSTR_INITIATED" }
  ].map(p => ({ ...p, fri_score: "LOW" }));
};

export const mockTimeline = {
  account_id: "UBI-2026-DEMO-001",
  fri_score: "LOW",
  current_score: 87,
  severity: "IMMINENT",
  data: generateDemoTimeline()
};

export const mockTimelineById = {
  "UBI-2026-DEMO-001": mockTimeline,
  "UBI-4491-8832-1120": {
    account_id: "UBI-4491-8832-1120",
    fri_score: "MEDIUM",
    current_score: 62,
    severity: "HOT",
    data: [
      { hour: 0, score: 15, signal_fired: null },
      { hour: 24, score: 35, signal_fired: null },
      { hour: 48, score: 55, signal_fired: "Signal 2 — Device Delta", signal_number: 2 },
      { hour: 72, score: 62, signal_fired: null }
    ].map(p => ({ ...p, fri_score: "MEDIUM" }))
  },
  "UBI-8892-1102-4431": {
    account_id: "UBI-8892-1102-4431",
    fri_score: "LOW",
    current_score: 81,
    severity: "CRITICAL",
    data: [
      { hour: 0, score: 20, signal_fired: null },
      { hour: 24, score: 45, signal_fired: "Signal 1 — Micro Credits", signal_number: 1 },
      { hour: 48, score: 65, signal_fired: "Signal 3 — Velocity", signal_number: 3 },
      { hour: 60, score: 76, signal_fired: null, threshold_crossed: "KYC_RESTRICTION" },
      { hour: 72, score: 81, signal_fired: "Signal 5 — FRI Delta", signal_number: 5 }
    ].map(p => ({ ...p, fri_score: "LOW" }))
  }
};
