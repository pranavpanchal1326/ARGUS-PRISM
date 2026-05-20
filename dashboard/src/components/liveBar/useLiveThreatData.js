import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '../../api/client';

const EMPTY_LIVE_DATA = {
  bandCounts: {
    CLEAN: 0,
    WARMING: 0,
    HOT: 0,
    CRITICAL: 0,
    IMMINENT: 0
  },
  highestScore: 0,
  highestScoreAccountId: 'NONE',
  pendingReview: 0,
  systemHealth: {
    FINACLE_FEED: 'LIVE',
    FRI_API: 'LIVE',
    DOT_DIP: 'LIVE',
    AUTOSTR_ENGINE: 'READY'
  },
  upiVelocity: 622000000
};

/**
 * Maps UPI transaction velocity to CSS animation duration.
 * 622,000,000 txns/day -> 800ms
 */
export function velocityToStreamDuration(velocity) {
  const BASE_VELOCITY = 622000000;
  const BASE_DURATION = 800;
  // Slower velocity = longer duration
  return (BASE_VELOCITY / velocity) * BASE_DURATION;
}

export function useLiveThreatData({ 
  pollingInterval = 5000, 
  mockMode = true,
  onImminentAccount,
  onSystemDegraded 
}) {
  const [data, setData] = useState(EMPTY_LIVE_DATA);
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const [scanningFlags, setScanningFlags] = useState({});
  const intervalsRef = useRef({});

  const barState = useMemo(() => {
    if (data.highestScore >= 85) return 'CRITICAL';
    if (data.highestScore >= 75) return 'ALERT';
    return 'DEFAULT';
  }, [data.highestScore]);

  const loadData = useCallback(async () => {
    const [accountsResponse, healthResponse] = await Promise.all([
      api.getAccounts({ risk_level: 'CRITICAL', page_size: 10 }),
      api.getHealth(),
    ]);
    const accounts = accountsResponse?.data?.accounts ?? [];
    const bandCounts = { CLEAN: 0, WARMING: 0, HOT: 0, CRITICAL: 0, IMMINENT: 0 };
    let highestScore = 0;
    let highestScoreAccountId = 'NONE';

    accounts.forEach(account => {
      const score = Number(account.current_warmth_score ?? 0);
      if (score >= 85) bandCounts.IMMINENT += 1;
      else if (score >= 75) bandCounts.CRITICAL += 1;
      else if (score >= 60) bandCounts.HOT += 1;
      else if (score >= 40) bandCounts.WARMING += 1;
      else bandCounts.CLEAN += 1;
      if (score >= highestScore) {
        highestScore = score;
        highestScoreAccountId = account.account_id;
      }
    });

    const services = healthResponse?.services ?? (
      healthResponse?.status === 'healthy' || healthResponse?.status === 'operational'
        ? { redis: 'ok', kafka: 'ok', ml_model: true }
        : {}
    );
    setData({
      bandCounts,
      highestScore,
      highestScoreAccountId,
      pendingReview: accounts.length,
      systemHealth: {
        FINACLE_FEED: healthResponse?.status === 'healthy' || healthResponse?.status === 'operational' ? 'LIVE' : 'DEGRADED',
        FRI_API: services.redis === 'ok' || services.redis === true ? 'LIVE' : 'DEGRADED',
        DOT_DIP: services.kafka === 'ok' || services.kafka === true ? 'LIVE' : 'DEGRADED',
        AUTOSTR_ENGINE: services.ml_model === 'ok' || services.ml_model === true ? 'READY' : 'DEGRADED',
      },
      upiVelocity: 622000000
    });
    setLastUpdated(new Date().toISOString());
    if (highestScore >= 85 && onImminentAccount) onImminentAccount(highestScoreAccountId, highestScore);
  }, [onImminentAccount]);

  useEffect(() => {
    loadData().catch(() => onSystemDegraded?.());
    intervalsRef.current.poll = setInterval(() => {
      loadData().catch(() => onSystemDegraded?.());
    }, pollingInterval);

    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, [loadData, onSystemDegraded, pollingInterval]);

  return {
    ...data,
    lastUpdated,
    barState,
    scanningFlags,
    connectionStatus: 'LIVE'
  };
}
