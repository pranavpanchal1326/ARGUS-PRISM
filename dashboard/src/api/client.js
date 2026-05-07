const BASE_URL = '/api';
const USE_MOCK = true; // Hardcoded for Phase 6A stability

const mockAlerts = [
  {
    alert_id: "6a55c271-8868-4a6c-9407-285b0907e5b1",
    account_id: "UBI-7742-8891-0021",
    warmth_score: 94.22,
    severity: "IMMINENT",
    alert_type: "WARMTH_THRESHOLD",
    top_signal: "Signal 1 — Test Credit Pattern",
    second_signal: "Signal 4 — Dormant Reactivation",
    hours_since_first_signal: 1.4,
    taint_flagged: true,
    created_at: new Date().toISOString(),
    acknowledged: false
  },
  {
    alert_id: "2b92d11a-1123-4556-9908-112233445566",
    account_id: "UBI-1120-4491-8832",
    warmth_score: 89.15,
    severity: "IMMINENT",
    alert_type: "FLOWGRAPH_TRIGGER",
    top_signal: "Signal 6 — Inbound Velocity",
    second_signal: "Signal 2 — Device Fingerprint",
    hours_since_first_signal: 2.8,
    taint_flagged: true,
    created_at: new Date().toISOString(),
    acknowledged: false
  },
  {
    alert_id: "7c11d22e-3344-5566-7788-99aabbccddee",
    account_id: "UBI-8892-1102-4431",
    warmth_score: 81.40,
    severity: "CRITICAL",
    alert_type: "WARMTH_THRESHOLD",
    top_signal: "Signal 4 — Dormant Reactivation",
    second_signal: "Signal 5 — SIM Swap Velocity",
    hours_since_first_signal: 12.5,
    taint_flagged: false,
    created_at: new Date().toISOString(),
    acknowledged: false
  },
  {
    alert_id: "8d22e33f-4455-6677-8899-001122334455",
    account_id: "UBI-4431-8892-1102",
    warmth_score: 77.80,
    severity: "CRITICAL",
    alert_type: "TAINT_HIT",
    top_signal: "Signal 2 — Device Fingerprint",
    second_signal: "Signal 3 — Velocity Derivative",
    hours_since_first_signal: 18.2,
    taint_flagged: true,
    created_at: new Date().toISOString(),
    acknowledged: false
  },
  {
    alert_id: "9e33f44a-5566-7788-9900-aabbccddeeff",
    account_id: "UBI-1102-4431-8892",
    warmth_score: 68.50,
    severity: "HOT",
    alert_type: "WARMTH_THRESHOLD",
    top_signal: "Signal 1 — Test Credit Pattern",
    second_signal: "Signal 6 — Inbound Velocity",
    hours_since_first_signal: 24.1,
    taint_flagged: false,
    created_at: new Date().toISOString(),
    acknowledged: false
  },
  {
    alert_id: "af44a55b-6677-8899-0011-223344556677",
    account_id: "UBI-8832-1120-4491",
    warmth_score: 62.10,
    severity: "HOT",
    alert_type: "FLOWGRAPH_TRIGGER",
    top_signal: "Signal 3 — Velocity Derivative",
    second_signal: "Signal 2 — Device Fingerprint",
    hours_since_first_signal: 31.5,
    taint_flagged: false,
    created_at: new Date().toISOString(),
    acknowledged: false
  },
  {
    alert_id: "bg55b66c-7788-8899-0011-223344556677",
    account_id: "UBI-0021-7742-8891",
    warmth_score: 54.30,
    severity: "WARMING",
    alert_type: "WARMTH_THRESHOLD",
    top_signal: "Signal 5 — SIM Swap Velocity",
    second_signal: "Signal 1 — Test Credit Pattern",
    hours_since_first_signal: 42.0,
    taint_flagged: false,
    created_at: new Date().toISOString(),
    acknowledged: false
  },
  {
    alert_id: "ch66c77d-8899-0011-2233-445566778899",
    account_id: "UBI-4491-8832-1120",
    warmth_score: 41.20,
    severity: "WARMING",
    alert_type: "WARMTH_THRESHOLD",
    top_signal: "Signal 2 — Device Fingerprint",
    second_signal: "Signal 3 — Velocity Derivative",
    hours_since_first_signal: 71.8,
    taint_flagged: false,
    created_at: new Date().toISOString(),
    acknowledged: false
  }
].sort((a, b) => b.warmth_score - a.warmth_score);

export async function fetchAlerts(severity = ['WARMING', 'HOT', 'CRITICAL', 'IMMINENT']) {
  if (USE_MOCK) {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 600));
    return mockAlerts.filter(a => severity.includes(a.severity));
  }
  
  const params = new URLSearchParams({ severity: severity.join(',') });
  const response = await fetch(`${BASE_URL}/alerts?${params}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function acknowledgeAlert(alertId) {
  if (USE_MOCK) {
    return { success: true, alert_id: alertId, acknowledged: true };
  }
  
  const response = await fetch(`${BASE_URL}/alerts/${alertId}/acknowledge`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function fetchAccountTimeline(accountId) {
  if (USE_MOCK) {
    const { mockTimelineById } = await import('./mock/timeline.mock.js');
    // Simulate slight delay
    await new Promise(r => setTimeout(r, 400));
    const timeline = mockTimelineById[accountId];
    if (!timeline) throw new Error(`No mock timeline for account: ${accountId}`);
    return timeline;
  }
  const response = await fetch(`${BASE_URL}/warmthscore/${accountId}/timeline`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function fetchFlowGraph(accountId) {
  if (USE_MOCK) {
    const { mockFlowGraphById } = await import('./mock/flowgraph.mock.js');
    const graph = mockFlowGraphById[accountId];
    if (!graph) throw new Error(`No mock flowgraph for: ${accountId}`);
    // Simulate network latency for realism
    await new Promise(resolve => setTimeout(resolve, 180));
    return graph;
  }
  const response = await fetch(`${BASE_URL}/flowgraph/${accountId}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function fetchRecruiterMap(bankId = 'UNION_BANK_OF_INDIA') {
  if (USE_MOCK) {
    const { mockRecruiterMap } = await import('./mock/recruitermap.mock.js');
    await new Promise(resolve => setTimeout(resolve, 220));
    return mockRecruiterMap;
  }
  const response = await fetch(`${BASE_URL}/recruiter-map?bank_id=${bankId}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function fetchAutoSTRPackages(caseId) {
  if (USE_MOCK) {
    const { mockAutoSTRPackages } = await import('./mock/autostr.mock.js');
    await new Promise(resolve => setTimeout(resolve, 350));
    // Simulate generation time — AutoSTR generation takes time
    return mockAutoSTRPackages;
  }
  const response = await fetch(`${BASE_URL}/autostr/packages/${caseId}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}
