import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MOCK_LIVE_DATA, SCORE_BANDS } from './liveThreatConfig';

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
  const [data, setData] = useState(MOCK_LIVE_DATA);
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
  const [scanningFlags, setScanningFlags] = useState({});
  const intervalsRef = useRef({});

  const barState = useMemo(() => {
    if (data.highestScore >= 85) return 'CRITICAL';
    if (data.highestScore >= 75) return 'ALERT';
    return 'DEFAULT';
  }, [data.highestScore]);

  const mutateData = useCallback(() => {
    setData(prev => {
      const next = { ...prev };
      
      // Randomly mutate one band count
      const bands = Object.keys(prev.bandCounts);
      const targetBand = bands[Math.floor(Math.random() * bands.length)];
      if (targetBand !== 'IMMINENT') {
        const delta = Math.random() > 0.5 ? 1 : -1;
        next.bandCounts[targetBand] = Math.max(0, prev.bandCounts[targetBand] + delta);
        setScanningFlags(sf => ({ ...sf, [targetBand]: true }));
        setTimeout(() => setScanningFlags(sf => ({ ...sf, [targetBand]: false })), 200);
      }

      // Randomly change highest score
      if (Math.random() > 0.7) {
        const scoreDelta = (Math.random() * 2 - 1).toFixed(1);
        next.highestScore = Math.min(100, Math.max(80, parseFloat(prev.highestScore) + parseFloat(scoreDelta)));
      }

      setLastUpdated(new Date().toISOString());
      return next;
    });
  }, []);

  const simulateImminent = useCallback(() => {
    setData(prev => {
      const next = { ...prev };
      next.bandCounts.IMMINENT += 1;
      next.pendingReview += 1;
      
      if (onImminentAccount) {
        onImminentAccount('UBI-' + Date.now().toString().slice(-4), 88.2);
      }
      
      return next;
    });
  }, [onImminentAccount]);

  useEffect(() => {
    if (mockMode) {
      intervalsRef.current.mutation = setInterval(mutateData, 8000);
      intervalsRef.current.imminent = setInterval(simulateImminent, 30000);
    } else {
      // Real polling logic would go here
      console.log('[PRISM] Threat data polling active');
    }

    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, [mockMode, mutateData, simulateImminent]);

  return {
    ...data,
    lastUpdated,
    barState,
    scanningFlags,
    connectionStatus: mockMode ? 'MOCK' : 'LIVE'
  };
}
