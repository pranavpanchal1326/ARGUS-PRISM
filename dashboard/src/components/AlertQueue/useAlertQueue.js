import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DEMO_ALERTS, sortAlerts, resolveCardState } from './alertQueueConfig';

export function useAlertQueue({
  mockMode = true,
  pollingInterval = 5000,
  onCardAction = () => {},
  onNewImminent = () => {}
} = {}) {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toISOString());
  const [scanningFields, setScanningFields] = useState(new Set());

  const initialLoadRef = useRef(false);

  // Sorting and derived counts
  const sortedAlerts = useMemo(() => sortAlerts(alerts), [alerts]);
  
  const counts = useMemo(() => {
    return alerts.reduce((acc, alert) => {
      const state = resolveCardState(alert.warmthScore);
      acc[state.id.toLowerCase() + 'Count']++;
      acc.totalCount++;
      return acc;
    }, {
      imminentCount: 0,
      criticalCount: 0,
      hotCount: 0,
      warmingCount: 0,
      totalCount: 0
    });
  }, [alerts]);

  // Mock initial load
  useEffect(() => {
    if (mockMode && !initialLoadRef.current) {
      setAlerts(DEMO_ALERTS);
      setIsLoading(false);
      initialLoadRef.current = true;
    }
  }, [mockMode]);

  // Mock simulation: score changes
  useEffect(() => {
    if (!mockMode) return;

    const interval = setInterval(() => {
      setAlerts(currentAlerts => {
        const nextAlerts = [...currentAlerts];
        // Pick a random non-IMMINENT alert
        const candidates = nextAlerts.filter(a => a.warmthScore < 85);
        if (candidates.length === 0) return currentAlerts;

        const targetIndex = nextAlerts.indexOf(candidates[Math.floor(Math.random() * candidates.length)]);
        const oldScore = nextAlerts[targetIndex].warmthScore;
        const increment = Math.floor(Math.random() * 5) + 3; // 3-7 points
        const newScore = Math.min(oldScore + increment, 100);
        
        nextAlerts[targetIndex] = {
          ...nextAlerts[targetIndex],
          warmthScore: newScore
        };

        // If score crossed a threshold, trigger scanning
        const oldState = resolveCardState(oldScore);
        const newState = resolveCardState(newScore);
        
        if (oldState.id !== newState.id) {
          const alertId = nextAlerts[targetIndex].alertId;
          setScanningFields(prev => {
            const next = new Set(prev);
            next.add(alertId);
            return next;
          });
          
          setTimeout(() => {
            setScanningFields(prev => {
              const next = new Set(prev);
              next.delete(alertId);
              return next;
            });
          }, 200);

          if (newState.id === 'IMMINENT') {
            onNewImminent(nextAlerts[targetIndex]);
            document.body.classList.add('viewport-flash');
            setTimeout(() => document.body.classList.remove('viewport-flash'), 50);
          }
        }

        return nextAlerts;
      });
    }, 25000);

    return () => clearInterval(interval);
  }, [mockMode, onNewImminent]);

  // Mock simulation: new alerts
  useEffect(() => {
    if (!mockMode) return;

    const interval = setInterval(() => {
      const newAlert = {
        alertId: `ALT-2026-${Math.floor(Math.random() * 9000) + 1000}`,
        accountId: `UBI-2026-AUTO-${Math.floor(Math.random() * 900) + 100}`,
        warmthScore: 40 + Math.floor(Math.random() * 15),
        firstSignalAt: new Date().toISOString(),
        topSignals: [
          { name: 'VELOCITY DERIVATIVE', contribution: 12 },
          { name: 'TEST CREDIT PATTERN', contribution: 8 }
        ],
        taint: { score: 0, hopCount: 0 },
        status: 'WARMING',
        mlroRequired: false
      };

      setAlerts(prev => [...prev, newAlert]);
      setLastRefreshed(new Date().toISOString());
    }, 45000);

    return () => clearInterval(interval);
  }, [mockMode]);

  const acknowledgeAlert = useCallback((alertId) => {
    setAlerts(prev => prev.filter(a => a.alertId !== alertId));
    // In real mode: POST /api/alerts/{alertId}/acknowledge
    // Rollback logic would go here if API fails
  }, []);

  const dismissAlert = useCallback((alertId) => {
    setAlerts(prev => prev.filter(a => a.alertId !== alertId));
  }, []);

  const addMockAlert = useCallback((alert) => {
    setAlerts(prev => [...prev, alert]);
    if (resolveCardState(alert.warmthScore).id === 'IMMINENT') {
      onNewImminent(alert);
    }
  }, [onNewImminent]);

  return {
    alerts: sortedAlerts,
    ...counts,
    isLoading,
    lastRefreshed,
    acknowledgeAlert,
    dismissAlert,
    addMockAlert,
    scanningFields
  };
}
