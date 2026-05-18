import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchHealth, fetchAccounts, fetchAccount,
  fetchWarmthScore, fetchWarmthTimeline, fetchFlowGraph,
  fetchAlerts, acknowledgeAlert, fetchCases, fetchRecruiters,
} from './client';

let _pollingRegistry = null;
if (import.meta.env.DEV) {
  import('../dev/pollingRegistry').then(m => { _pollingRegistry = m.pollingRegistry; });
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

/* Polling hook */
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
    if (import.meta.env.DEV && _pollingRegistry) _pollingRegistry.register(id, 'poll');
    return () => {
      clearInterval(id);
      if (import.meta.env.DEV && _pollingRegistry) _pollingRegistry.unregister(id);
    };
  }, [run, intervalMs]);

  return { data, error, loading, refetch: run };
}

export function useHealth()  { return usePoll(() => fetchHealth(), [], 30000); }

export function useAccounts({ minScore = 0 } = {}) {
  return useApiCall(() => fetchAccounts({ minScore }), [minScore]);
}

export function useAccount(accountId) {
  return useApiCall(() => fetchAccount(accountId), [accountId]);
}

export function useWarmthScore(accountId) {
  return useApiCall(() => fetchWarmthScore(accountId), [accountId]);
}

export function useWarmthTimeline(accountId) {
  return useApiCall(() => fetchWarmthTimeline(accountId), [accountId]);
}

export function useFlowGraph(accountId) {
  return useApiCall(() => fetchFlowGraph(accountId), [accountId]);
}

export function useAlerts({ severity = null, acknowledged = false } = {}) {
  return usePoll(() => fetchAlerts({ severity, acknowledged }), [severity, acknowledged], 30000);
}

export function useCases({ status = 'OPEN' } = {}) {
  return useApiCall(() => fetchCases({ status }), [status]);
}

export function useRecruiters() {
  return useApiCall(() => fetchRecruiters(), []);
}

export { acknowledgeAlert };
