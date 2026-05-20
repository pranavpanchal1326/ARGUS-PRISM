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
