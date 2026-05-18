import { useState, useEffect, useCallback } from 'react';
import { MOCK_RECRUITERS } from './mockData';

const USE_MOCK = true;
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000';

export function useRecruiterData() {
  const [recruiters,  setRecruiters]  = useState([]);
  const [selectedId,  setSelectedId]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [freezingId,  setFreezingId]  = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      if (USE_MOCK) {
        await new Promise(r => setTimeout(r, 600));
        setRecruiters(MOCK_RECRUITERS);
        setSelectedId(MOCK_RECRUITERS[0].id);
        setLoading(false);
        return;
      }
      try {
        const res  = await fetch(`${API_BASE}/api/recruiters`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRecruiters(data);
        if (data.length) setSelectedId(data[0].id);
      } catch (err) {
        setError(err.message);
        setRecruiters(MOCK_RECRUITERS);
        setSelectedId(MOCK_RECRUITERS[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const freezeCampaign = useCallback(async (recruiterId) => {
    setFreezingId(recruiterId);
    const freeze = prev => prev.map(r => r.id !== recruiterId ? r : {
      ...r, status: 'FROZEN', frozenCount: r.downtreamCount, activeCount: 0,
      accounts: r.accounts.map(a => ({ ...a, status: 'FROZEN' })),
    });

    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 900));
      setRecruiters(freeze);
      setFreezingId(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/recruiters/${recruiterId}/freeze-campaign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await fetch(`${API_BASE}/api/recruiters`);
      setRecruiters(await updated.json());
    } catch {
      setRecruiters(freeze);
    } finally {
      setFreezingId(null);
    }
  }, []);

  return {
    recruiters,
    selectedId, setSelectedId,
    selectedRecruiter: recruiters.find(r => r.id === selectedId) || null,
    loading, error, freezingId, freezeCampaign,
  };
}
