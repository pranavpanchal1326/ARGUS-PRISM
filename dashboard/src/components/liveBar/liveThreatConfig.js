/**
 * ARGUS-PRISM · Live Threat Configuration
 * Defines score bands, system services, and baseline data for the persistent threat bar.
 */

export const SCORE_BANDS = [
  {
    id: 'CLEAN',
    label: 'CLEAN',
    min: 0,
    max: 40,
    textColor: 'var(--instrument-grey)',
    countColor: 'var(--instrument-grey)',
    description: 'NORMAL MONITORING'
  },
  {
    id: 'WARMING',
    label: 'WARMING',
    min: 40,
    max: 60,
    textColor: 'var(--instrument-grey)',
    countColor: 'var(--instrument-grey)',
    description: 'ENHANCED MONITORING'
  },
  {
    id: 'HOT',
    label: 'HOT',
    min: 60,
    max: 75,
    textColor: 'var(--instrument-white)',
    countColor: 'var(--instrument-white)',
    description: 'KYC RE-VERIFICATION'
  },
  {
    id: 'CRITICAL',
    label: 'CRITICAL',
    min: 75,
    max: 85,
    textColor: 'var(--instrument-white)',
    countColor: 'var(--instrument-white)',
    description: 'UPI RESTRICTED'
  },
  {
    id: 'IMMINENT',
    label: 'IMMINENT',
    min: 85,
    max: 100,
    textColor: 'var(--phosphor)',
    countColor: 'var(--phosphor)',
    description: 'FULL RESTRICTION · AUTOSTR'
  }
];

export const SYSTEM_SERVICES = [
  {
    id: 'FINACLE_FEED',
    label: 'FINACLE',
    endpoint: '/api/health/finacle',
    critical: true
  },
  {
    id: 'FRI_API',
    label: 'FRI API',
    endpoint: '/api/health/fri',
    critical: true
  },
  {
    id: 'DOT_DIP',
    label: 'DOT DIP',
    endpoint: '/api/health/dot',
    critical: false
  },
  {
    id: 'AUTOSTR_ENGINE',
    label: 'AUTOSTR',
    endpoint: '/api/health/autostr',
    critical: true
  }
];

export const MOCK_LIVE_DATA = {
  bandCounts: {
    CLEAN: 2847,
    WARMING: 34,
    HOT: 12,
    CRITICAL: 3,
    IMMINENT: 1
  },
  highestScore: 87.4,
  highestScoreAccountId: 'UBI-9921-4432-8801',
  pendingReview: 2,
  systemHealth: {
    FINACLE_FEED: 'LIVE',
    FRI_API: 'LIVE',
    DOT_DIP: 'LIVE',
    AUTOSTR_ENGINE: 'READY'
  },
  upiVelocity: 622000000
};
