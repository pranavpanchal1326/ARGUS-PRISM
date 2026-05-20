import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client';

function normalizeClass(value) {
  if (value === 'INDUSTRIAL_ORCHESTRATOR') return 'ORCHESTRATOR';
  if (value === 'CAMPAIGN_COORDINATOR') return 'COORDINATOR';
  return value || 'COORDINATOR';
}

function mapAccount(account, index) {
  return {
    id: account.target_id || account.account_id || `DOWNSTREAM-${index}`,
    name: account.target_id || account.account_id || `Downstream ${index + 1}`,
    score: Number(account.target_warmth ?? account.current_warmth_score ?? 0),
    status: account.target_status || account.account_status || 'ACTIVE',
    txnCount: Number(account.txn_count ?? account.transaction_count ?? 1),
    amount: Number(account.amount ?? 0),
  };
}

function mapRecruiter(raw, campaign = null) {
  const downstream = campaign?.downstream_accounts ?? raw.downstream_accounts ?? [];
  const accounts = downstream.map((account, index) =>
    typeof account === 'string'
      ? mapAccount({ target_id: account, target_warmth: 75, target_status: 'ACTIVE' }, index)
      : mapAccount(account, index)
  );
  const frozenCount = Number(raw.total_frozen ?? accounts.filter(a => a.status === 'FROZEN').length);
  const downstreamCount = Number(campaign?.downstream_count ?? raw.downstream_count ?? accounts.length);

  return {
    id: raw.recruiter_id || raw.id || campaign?.recruiter?.account_id,
    accountId: raw.recruiter_id || raw.accountId || campaign?.recruiter?.account_id,
    holderName: raw.campaign_name && raw.campaign_name !== 'UNKNOWN'
      ? raw.campaign_name
      : (raw.recruiter_id || campaign?.recruiter?.account_id || 'Recruiter Account'),
    classification: normalizeClass(campaign?.classification ?? raw.classification),
    detectedAt: raw.detected_at || new Date().toISOString(),
    downtreamCount: downstreamCount,
    activeCount: Math.max(0, downstreamCount - frozenCount),
    frozenCount,
    totalAmountTransacted: accounts.reduce((sum, account) => sum + Number(account.amount ?? 0), 0),
    campaignDurationHours: Number(raw.window_hours ?? 48),
    status: raw.recruiter_status || campaign?.recruiter?.status || 'ACTIVE',
    accounts,
  };
}

export function useRecruiterData() {
  const [recruiters,  setRecruiters]  = useState([]);
  const [selectedId,  setSelectedId]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [freezingId,  setFreezingId]  = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const response = await api.getRecruiterMap({ window_hours: 48 });
        const nextRecruiters = (response?.recruiters ?? []).map(r => mapRecruiter(r));
        setRecruiters(nextRecruiters);
        if (nextRecruiters.length) setSelectedId(nextRecruiters[0].id);
      } catch (err) {
        setError(err.message);
        setRecruiters([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let mounted = true;
    (async () => {
      try {
        const response = await api.getRecruiterCampaign(selectedId);
        const campaign = response?.data ?? response;
        if (!mounted) return;
        setRecruiters(prev => prev.map(recruiter =>
          recruiter.id === selectedId ? mapRecruiter(recruiter, campaign) : recruiter
        ));
      } catch {
        if (mounted) setError('Failed to load recruiter campaign');
      }
    })();
    return () => { mounted = false; };
  }, [selectedId]);

  const freezeCampaign = useCallback(async (recruiterId) => {
    setFreezingId(recruiterId);
    try {
      await api.freezeCampaign(recruiterId, { freeze_reason: 'Mule detected', authorized_by: 'MLRO' });
    } finally {
      setRecruiters(prev => prev.map(r => r.id !== recruiterId ? r : {
        ...r, status: 'FROZEN', frozenCount: r.downtreamCount, activeCount: 0,
        accounts: r.accounts.map(a => ({ ...a, status: 'FROZEN' })),
      }));
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
