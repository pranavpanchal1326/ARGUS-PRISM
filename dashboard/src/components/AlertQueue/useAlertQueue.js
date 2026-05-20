import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '../../api/client';
import { sortAlerts, resolveCardState } from './alertQueueConfig';

function accountToCardAlert(account, index) {
  const warmthScore = Math.round(Number(account.current_warmth_score ?? account.warmth_score ?? 0));
  const status = warmthScore >= 85 ? 'IMMINENT' : warmthScore >= 75 ? 'CRITICAL' : warmthScore >= 60 ? 'HOT' : 'WARMING';
  return {
    alertId: `ALT-${account.account_id ?? index}`,
    accountId: account.account_id,
    warmthScore,
    firstSignalAt: account.updated_at || account.account_opened_at || new Date().toISOString(),
    topSignals: [
      { name: account.top_signal || account.warmth_risk_level || 'WARMTHSCORE', contribution: Math.max(1, Math.round(warmthScore / 4)) },
      { name: 'LIVE BACKEND ACCOUNT', contribution: Math.max(1, Math.round(warmthScore / 8)) },
    ],
    taint: { score: Number(account.taint_score ?? 0), hopCount: Number(account.taint_score ?? 0) > 0 ? 1 : 0 },
    status,
    mlroRequired: warmthScore >= 85,
  };
}

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

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await api.getAccounts({ risk_level: 'CRITICAL', page_size: 20 });
        const nextAlerts = (response?.data?.accounts ?? []).map(accountToCardAlert);
        if (!mounted) return;
        setAlerts(nextAlerts);
        setLastRefreshed(new Date().toISOString());
        setIsLoading(false);
        if (!initialLoadRef.current) {
          const imminent = nextAlerts.find(alert => resolveCardState(alert.warmthScore).id === 'IMMINENT');
          if (imminent) onNewImminent(imminent);
          initialLoadRef.current = true;
        }
      } catch {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    const interval = setInterval(load, pollingInterval);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pollingInterval, onNewImminent]);

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
