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
  const score = Number(account.current_warmth_score ?? account.warmth_score ?? 0);
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
  return rows.map((point, index) => ({
    hour: point.hour ?? index,
    timestamp: point.timestamp,
    score: Number(point.score ?? point.warmth_score ?? 0),
    risk_level: point.risk_level,
    signals: point.signals ?? {},
    top_signals: point.top_signals ?? [],
    label: point.top_signals?.[0]?.signal ?? point.label ?? null,
    signal: point.top_signals?.[0]?.signal ?? point.signal ?? null,
    threshold_crossed: point.threshold_crossed,
  }));
}

function timelinePointToScore(point, accountId) {
  const signals = point?.signals ?? {};
  const topSignals = point?.top_signals ?? Object.entries(signals)
    .map(([signal, impact]) => ({ signal, impact: Number(impact ?? 0) }))
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    account_id: accountId,
    warmth_score: Number(point?.score ?? 0),
    risk_level: point?.risk_level ?? riskFromScore(Number(point?.score ?? 0)),
    signals: Object.entries(signals).map(([signal_name, impact]) => ({
      signal_name,
      score: Number(impact ?? 0),
      weight: 0,
      description: signal_name,
    })),
    shap_top3: topSignals.slice(0, 3).map(item => ({
      signal: item.signal,
      impact: Number(item.impact ?? 0),
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
      return ok(normalizeTimeline(await api.getScoreTimeline(accountId, 50)));
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
  }, [severity, acknowledged], 30000);
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
        risk_score: Number(account.current_warmth_score ?? 0),
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

export async function acknowledgeAlert(alertId) {
  return ok({ success: true, alert_id: alertId, acknowledged_at: new Date().toISOString() });
}
