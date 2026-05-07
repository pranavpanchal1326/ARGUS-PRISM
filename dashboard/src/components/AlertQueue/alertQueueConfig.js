export const CARD_STATES = {
  WARMING: {
    id: 'WARMING',
    scoreMin: 40,
    scoreMax: 60,
    scoreSize: '32px',
    opacity: 0.7,
    borderLeft: '2px solid var(--instrument-dark)',
    actionLabel: null,
    actionEnabled: false,
    pulseEnabled: false,
    inverted: false
  },
  HOT: {
    id: 'HOT',
    scoreMin: 60,
    scoreMax: 75,
    scoreSize: '40px',
    opacity: 1,
    borderLeft: '2px solid var(--instrument-white)',
    actionLabel: 'VIEW TIMELINE',
    actionEnabled: true,
    pulseEnabled: false,
    inverted: false
  },
  CRITICAL: {
    id: 'CRITICAL',
    scoreMin: 75,
    scoreMax: 85,
    scoreSize: '48px',
    opacity: 1,
    borderLeft: '2px solid var(--phosphor)',
    actionLabel: 'REVIEW CASE',
    actionEnabled: true,
    pulseEnabled: false,
    inverted: false
  },
  IMMINENT: {
    id: 'IMMINENT',
    scoreMin: 85,
    scoreMax: 100,
    scoreSize: '64px',
    opacity: 1,
    borderLeft: 'none',
    actionLabel: 'MLRO DECISION REQUIRED',
    actionEnabled: true,
    pulseEnabled: true,
    inverted: true
  }
};

export function resolveCardState(score) {
  if (score >= 85) return CARD_STATES.IMMINENT;
  if (score >= 75) return CARD_STATES.CRITICAL;
  if (score >= 60) return CARD_STATES.HOT;
  return CARD_STATES.WARMING;
}

export const DEMO_ALERTS = [
  {
    alertId: 'ALT-2026-0847',
    accountId: 'UBI-2026-DEMO-001',
    warmthScore: 87,
    firstSignalAt: '2026-03-21T00:00:00Z',
    topSignals: [
      { name: 'DORMANT REACTIVATION', contribution: 31 },
      { name: 'DEVICE FINGERPRINT', contribution: 22 }
    ],
    taint: { score: 0, hopCount: 0 },
    status: 'IMMINENT',
    mlroRequired: true
  },
  {
    alertId: 'ALT-2026-0831',
    accountId: 'UBI-2026-DEMO-002',
    warmthScore: 79,
    firstSignalAt: '2026-03-21T04:30:00Z',
    topSignals: [
      { name: 'FRI CONTRADICTION', contribution: 18 },
      { name: 'TEST CREDIT PATTERN', contribution: 14 }
    ],
    taint: { score: 75, hopCount: 1 },
    status: 'CRITICAL',
    mlroRequired: false
  },
  {
    alertId: 'ALT-2026-0819',
    accountId: 'UBI-2026-DEMO-003',
    warmthScore: 76,
    firstSignalAt: '2026-03-21T06:15:00Z',
    topSignals: [
      { name: 'SIM SWAP VELOCITY', contribution: 24 },
      { name: 'VELOCITY DERIVATIVE', contribution: 16 }
    ],
    taint: { score: 0, hopCount: 0 },
    status: 'CRITICAL',
    mlroRequired: false
  },
  {
    alertId: 'ALT-2026-0804',
    accountId: 'UBI-2026-DEMO-004',
    warmthScore: 68,
    firstSignalAt: '2026-03-21T08:00:00Z',
    topSignals: [
      { name: 'DEVICE FINGERPRINT', contribution: 22 },
      { name: 'TEST CREDIT PATTERN', contribution: 11 }
    ],
    taint: { score: 55, hopCount: 2 },
    status: 'HOT',
    mlroRequired: false
  },
  {
    alertId: 'ALT-2026-0798',
    accountId: 'UBI-2026-DEMO-005',
    warmthScore: 63,
    firstSignalAt: '2026-03-21T09:45:00Z',
    topSignals: [
      { name: 'DORMANT REACTIVATION', contribution: 20 },
      { name: 'FRI CONTRADICTION', contribution: 15 }
    ],
    taint: { score: 0, hopCount: 0 },
    status: 'HOT',
    mlroRequired: false
  },
  {
    alertId: 'ALT-2026-0787',
    accountId: 'UBI-2026-DEMO-006',
    warmthScore: 58,
    firstSignalAt: '2026-03-21T10:30:00Z',
    topSignals: [
      { name: 'VELOCITY DERIVATIVE', contribution: 15 },
      { name: 'TEST CREDIT PATTERN', contribution: 9 }
    ],
    taint: { score: 30, hopCount: 3 },
    status: 'WARMING',
    mlroRequired: false
  },
  {
    alertId: 'ALT-2026-0774',
    accountId: 'UBI-2026-DEMO-007',
    warmthScore: 51,
    firstSignalAt: '2026-03-21T11:00:00Z',
    topSignals: [
      { name: 'SIM SWAP VELOCITY', contribution: 10 },
      { name: 'DEVICE FINGERPRINT', contribution: 8 }
    ],
    taint: { score: 0, hopCount: 0 },
    status: 'WARMING',
    mlroRequired: false
  },
  {
    alertId: 'ALT-2026-0761',
    accountId: 'UBI-2026-DEMO-008',
    warmthScore: 44,
    firstSignalAt: '2026-03-21T11:45:00Z',
    topSignals: [
      { name: 'TEST CREDIT PATTERN', contribution: 11 },
      { name: 'VELOCITY DERIVATIVE', contribution: 7 }
    ],
    taint: { score: 0, hopCount: 0 },
    status: 'WARMING',
    mlroRequired: false
  }
];

export function sortAlerts(alerts) {
  return [...alerts].sort((a, b) => {
    const stateA = resolveCardState(a.warmthScore);
    const stateB = resolveCardState(b.warmthScore);

    const order = { IMMINENT: 0, CRITICAL: 1, HOT: 2, WARMING: 3 };
    
    if (order[stateA.id] !== order[stateB.id]) {
      return order[stateA.id] - order[stateB.id];
    }
    
    return b.warmthScore - a.warmthScore;
  });
}
