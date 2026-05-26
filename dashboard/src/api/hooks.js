import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './client';

let _pollingRegistry = null;
if (import.meta.env.DEV) {
  import('../dev/pollingRegistry').then(m => { _pollingRegistry = m.pollingRegistry; });
}

function ok(data) {
  return { data, error: null, loading: false };
}

function fail(error) {
  return {
    data: null,
    error: { status: 0, message: error?.message || 'Network error' },
    loading: false,
  };
}

function accountName(account) {
  return account.account_holder_name || account.name || account.account_id;
}

function riskFromScore(score, fallback = 'CRITICAL') {
  if (fallback && fallback !== 'CLEAN') return fallback === 'IMMINENT' ? 'CRITICAL' : fallback;
  if (score >= 85) return 'CRITICAL';
  if (score >= 75) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function accountToAlert(account, index = 0) {
  const score = Math.round(Number(account.current_warmth_score ?? account.warmth_score ?? 0) * 10) / 10;
  const risk = riskFromScore(score, account.warmth_risk_level ?? account.risk_level);
  return {
    alert_id: `ALERT-${account.account_id ?? index}`,
    account_id: account.account_id,
    account_name: accountName(account),
    alert_type: account.is_confirmed_mule ? 'TAINT_HIT' : 'WARMTH_THRESHOLD',
    severity: risk,
    score,
    top_signal: account.top_signal || account.primary_signal || 'WarmthScore threshold crossed',
    created_at: account.updated_at || account.account_opened_at || new Date().toISOString(),
    acknowledged: false,
    taint_hit: Boolean(account.taint_score || account.is_confirmed_mule),
  };
}

function normalizeTimeline(raw) {
  const rows = Array.isArray(raw) ? raw : [];
  const points = rows.map((point, index) => {
    const score = Math.round(Number(point.score ?? point.warmth_score ?? 0) * 10) / 10;
    return {
      hour: point.hour ?? index,
      timestamp: point.timestamp ?? point.computed_at,
      score,
      risk_level: point.risk_level,
      signals: point.signals ?? {},
      top_signals: point.top_signals ?? [],
      label: point.top_signals?.[0]?.signal ?? point.label ?? point.primary_signal ?? null,
      signal: point.top_signals?.[0]?.signal ?? point.signal ?? point.primary_signal ?? null,
      threshold_crossed: point.threshold_crossed ?? (score >= 85 ? 85 : score >= 75 ? 75 : null),
    };
  });

  // Sort chronologically (oldest to newest) for Recharts Area/Line chart
  points.sort((a, b) => {
    if (a.timestamp && b.timestamp) {
      return new Date(a.timestamp) - new Date(b.timestamp);
    }
    return a.hour - b.hour;
  });

  // Re-map hour value based on sorted array index if we don't have explicit hours
  points.forEach((point, index) => {
    point.hour = point.hour ?? index;
  });

  return points;
}

function timelinePointToScore(point, accountId) {
  const signals = point?.signals ?? {};
  const topSignals = point?.top_signals ?? Object.entries(signals)
    .map(([signal, impact]) => ({ signal, impact: Math.round(Number(impact ?? 0) * 10) / 10 }))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    account_id: accountId,
    warmth_score: Math.round(Number(point?.score ?? 0) * 10) / 10,
    risk_level: point?.risk_level ?? riskFromScore(Math.round(Number(point?.score ?? 0) * 10) / 10),
    signals: Object.entries(signals).map(([signal_name, impact]) => ({
      signal_name,
      score: Number(impact ?? 0),
      weight: 0,
      description: signal_name,
    })),
    shap_top3: topSignals.slice(0, 3).map(item => ({
      signal: item.signal,
      impact: Math.round(Number(item.impact ?? 0) * 10) / 10,
    })),
    timestamp: point?.timestamp ?? new Date().toISOString(),
  };
}

function transactionsToGraph(accountId, graph) {
  const transactions = graph?.transactions ?? [];
  const ids = new Set([graph?.account_id || accountId]);
  transactions.forEach(txn => {
    const source = txn.source_account ?? (txn.direction === 'OUTBOUND' ? accountId : txn.counterpart);
    const target = txn.target_account ?? (txn.direction === 'OUTBOUND' ? txn.counterpart : accountId);
    if (source) ids.add(source);
    if (target) ids.add(target);
  });

  const nodes = [...ids].map(id => ({
    id,
    name: id,
    score: id === (graph?.account_id || accountId) ? 85 : 60,
    isRecruiter: false,
    isFocus: id === (graph?.account_id || accountId),
    taintScore: 0,
    primarySignal: id === (graph?.account_id || accountId) ? 'Focus account' : 'Counterparty',
    isConfirmed: false,
  }));

  const links = transactions.map(txn => ({
    source: txn.source_account ?? (txn.direction === 'OUTBOUND' ? accountId : txn.counterpart),
    target: txn.target_account ?? (txn.direction === 'OUTBOUND' ? txn.counterpart : accountId),
    value: Number(txn.amount ?? 0),
    channel: txn.channel ?? 'UPI',
    timestamp: txn.timestamp,
  }));

  return {
    ...graph,
    nodes,
    links,
  };
}

function useApiCall(fn, deps) {
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await fn();
    if (res.error) setError(res.error); else setData(res.data);
    setLoading(false);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { run(); }, [run]);
  return { data, error, loading, refetch: run };
}

function usePoll(fn, deps, intervalMs) {
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(true);
  const idRef = useRef(null);

  const run = useCallback(async () => {
    const res = await fn();
    if (res.error) setError(res.error); else { setData(res.data); setError(null); }
    setLoading(false);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    run();
    const id = setInterval(run, intervalMs);
    idRef.current = id;
    if (import.meta.env.DEV && _pollingRegistry) _pollingRegistry.register(id, 'poll');
    return () => {
      clearInterval(idRef.current);
      if (import.meta.env.DEV && _pollingRegistry) _pollingRegistry.unregister(idRef.current);
    };
  }, [run, intervalMs]);

  return { data, error, loading, refetch: run };
}

export function useHealth() {
  return usePoll(async () => {
    try { return ok(await api.getHealth()); } catch (error) { return fail(error); }
  }, [], 15000);
}

export function useAccounts({ minScore = 0 } = {}) {
  return useApiCall(async () => {
    try {
      const response = await api.getAccounts({ page_size: 20 });
      const accounts = response?.data?.accounts ?? [];
      return ok(minScore ? accounts.filter(a => Number(a.current_warmth_score ?? 0) >= minScore) : accounts);
    } catch (error) {
      return fail(error);
    }
  }, [minScore]);
}

export function useAccount(accountId) {
  return useApiCall(async () => {
    if (!accountId) return ok(null);
    try {
      const response = await api.getAccount(accountId);
      return ok(response?.data ?? response);
    } catch (error) {
      return fail(error);
    }
  }, [accountId]);
}

export function useWarmthScore(accountId) {
  return useApiCall(async () => {
    if (!accountId) return ok(null);
    try {
      const timeline = await api.getScoreTimeline(accountId, 1);
      const latest = Array.isArray(timeline) ? (timeline[0] ?? timeline[timeline.length - 1]) : null;
      if (!latest) return ok(null);
      return ok(timelinePointToScore(latest, accountId));
    } catch (error) {
      return fail(error);
    }
  }, [accountId]);
}

export function useWarmthTimeline(accountId) {
  return useApiCall(async () => {
    if (!accountId) return ok([]);
    try {
      // 1. For demo accounts, prioritize Neo4j timeline/signals endpoint
      if (accountId.includes('DEMO') || !accountId.startsWith('LIVE-')) {
        try {
          const res = await api.getAccountSignalTimeline(accountId, 72);
          if (res && Array.isArray(res.timeline) && res.timeline.length > 0) {
            return ok(normalizeTimeline(res.timeline));
          }
        } catch (e) {
          console.warn("Failed fetching Neo4j timeline/signals, trying PostgreSQL:", e);
        }
      }

      // 2. Try PostgreSQL warmthscore v1 timeline endpoint
      try {
        const res = await api.getScoreTimeline(accountId, 50);
        if (Array.isArray(res) && res.length > 0) {
          return ok(normalizeTimeline(res));
        }
      } catch (e) {
        console.warn("Failed fetching v1 warmthscore timeline, trying direct accounts timeline:", e);
      }

      // 3. Fallback to /api/accounts/{id}/timeline endpoint
      try {
        const res = await api.getAccountTimeline(accountId);
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          return ok(normalizeTimeline(res.data));
        }
      } catch (e) {
        console.warn("All timeline endpoints returned empty or failed:", e);
      }

      return ok([]);
    } catch (error) {
      return fail(error);
    }
  }, [accountId]);
}

export function useFlowGraph(accountId) {
  return useApiCall(async () => {
    if (!accountId) return ok({ nodes: [], links: [], transactions: [] });
    try {
      const graph = await api.getAccountGraphEvents(accountId);
      return ok(transactionsToGraph(accountId, graph));
    } catch (error) {
      return fail(error);
    }
  }, [accountId]);
}

export function useAlerts({ severity = null, acknowledged = false } = {}) {
  return usePoll(async () => {
    try {
      const response = await api.getGlobalAlerts({ is_acknowledged: acknowledged });
      if (response && response.success && response.data && Array.isArray(response.data.alerts)) {
        let alerts = response.data.alerts.map(a => ({
          alert_id: a.alert_id,
          account_id: a.account_id,
          account_name: a.account_name || `Account ${a.account_id}`,
          alert_type: a.alert_type,
          severity: a.severity,
          score: Math.round(Number(a.warmth_score_at_alert ?? 0) * 10) / 10,
          top_signal: a.alert_message || a.primary_signal || 'WarmthScore threshold crossed',
          created_at: a.created_at,
          acknowledged: a.is_acknowledged,
          taint_hit: a.alert_type === 'TAINT_HIT' || a.severity === 'CRITICAL'
        }));
        if (severity) {
          const allowed = new Set(severity.split(','));
          alerts = alerts.filter(alert => allowed.has(alert.severity));
        }
        return ok(alerts);
      }
    } catch (e) {
      console.warn("Failed to fetch global alerts from backend, trying prototype fallback:", e);
    }
    try {
      const response = await api.getAccounts({ risk_level: 'CRITICAL', page_size: 20 });
      let alerts = (response?.data?.accounts ?? []).map(accountToAlert);
      if (severity) {
        const allowed = new Set(severity.split(','));
        alerts = alerts.filter(alert => allowed.has(alert.severity));
      }
      if (acknowledged) alerts = [];
      return ok(alerts);
    } catch (error) {
      return fail(error);
    }
  }, [severity, acknowledged], 10000);
}

export function useCases({ status = 'OPEN' } = {}) {
  return useApiCall(async () => {
    try {
      const response = await api.getAccounts({ risk_level: 'CRITICAL', page_size: 20 });
      const cases = (response?.data?.accounts ?? []).map((account, index) => ({
        case_id: `CASE-${String(index + 9912).padStart(4, '0')}`,
        account_id: account.account_id,
        account_name: accountName(account),
        status,
        risk_score: Math.round(Number(account.current_warmth_score ?? 0) * 10) / 10,
        created_at: account.updated_at || account.account_opened_at,
        assigned_to: 'MLRO',
        notes: '',
        str_status: 'PENDING',
      }));
      return ok(cases);
    } catch (error) {
      return fail(error);
    }
  }, [status]);
}

export function useRecruiters() {
  return useApiCall(async () => {
    try {
      const response = await api.getRecruiterMap({ window_hours: 48 });
      return ok(response?.recruiters ?? []);
    } catch (error) {
      return fail(error);
    }
  }, []);
}

export async function acknowledgeAlert(alertId, payload = {}) {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(alertId);
    if (!isUuid) {
      return ok({ success: true, alert_id: alertId, acknowledged_at: new Date().toISOString() });
    }
    const body = {
      acknowledged_by: payload.acknowledged_by || 'PRISM MLRO',
      is_false_positive: payload.is_false_positive || false,
      false_positive_reason: payload.false_positive_reason || null,
    };
    const res = await api.resolveAlert(alertId, body);
    return ok(res?.data ?? res);
  } catch (error) {
    console.warn("Failed to resolve alert on backend, using fallback:", error);
    return ok({ success: true, alert_id: alertId, acknowledged_at: new Date().toISOString(), fallback: true });
  }
}

export async function escalateAlert(alertId, notes = '') {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(alertId);
    if (!isUuid) {
      return ok({ success: true, alert_id: alertId, status: 'ESCALATED', severity: 'CRITICAL' });
    }
    const res = await api.escalateAlert(alertId, { escalated_by: 'PRISM MLRO', notes });
    return ok(res?.data ?? res);
  } catch (error) {
    console.warn("Failed to escalate alert on backend, using fallback:", error);
    return ok({ success: true, alert_id: alertId, status: 'ESCALATED', severity: 'CRITICAL', fallback: true });
  }
}

