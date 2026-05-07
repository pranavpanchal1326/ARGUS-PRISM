import React, { useState, useEffect } from 'react';
import RecruiterCanvas from './RecruiterCanvas';
import CampaignPanel from './CampaignPanel';
import './RecruiterMapView.css';

// --- MOCK DATA GENERATOR ---
const generateMockCampaign = () => {
  const warmingAccounts = [];
  const now = new Date();

  // Create 23 accounts with varied scores
  for (let i = 1; i <= 23; i++) {
    let score, status;
    if (i <= 4) { score = 85 + Math.floor(Math.random() * 10); status = "WARMING"; }
    else if (i <= 12) { score = 60 + Math.floor(Math.random() * 20); status = "WARMING"; }
    else { score = 15 + Math.floor(Math.random() * 40); status = "WARMING"; }

    warmingAccounts.push({
      id: `UBI-ACC-${1000 + i}`,
      label: `ACC_${i.toString().padStart(3, '0')}`,
      warmth_score: score,
      risk_level: score >= 85 ? "IMMINENT" : score >= 60 ? "HOT" : "WARMING",
      is_confirmed_mule: score >= 85,
      test_payment_received: 50,
      test_payment_timestamp: new Date(now.getTime() - i * 3600000).toISOString(),
      current_status: status
    });
  }

  return {
    campaign_id: "PRISM-CMP-2026-042",
    recruiter: {
      id: "91-98421-XXXXX",
      label: "COORDINATOR_A",
      warmth_score: 18,
      classification: "INDUSTRIAL_ORCHESTRATOR",
      accounts_recruited: 23,
      test_payments_sent: 23,
      campaign_start: new Date(now.getTime() - 48 * 3600000).toISOString(),
      campaign_duration_hours: 48,
      total_test_value: 1150,
      status: "ACTIVE"
    },
    warming_accounts: warmingAccounts,
    campaign_metadata: {
      total_accounts_in_campaign: 23,
      accounts_restricted: 0,
      accounts_frozen: 0,
      accounts_still_warming: 23,
      estimated_intended_fraud_value: 28400000,
      prism_detection_timestamp: now.toISOString(),
      campaign_classification: "INDUSTRIAL_ORCHESTRATOR"
    }
  };
};

const RecruiterMapView = ({ 
  accountId = 'UBI-2026-DEMO-NET',
  onViewTimeline = (id) => console.log('Timeline:', id)
}) => {
  const [campaign, setCampaign] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isFrozen, setIsFrozen] = useState(false);

  useEffect(() => {
    // Simulate fetch
    const data = generateMockCampaign();
    setCampaign(data);
  }, []);

  const handleFreeze = () => {
    setIsFrozen(true);
    // Update local state to reflect freeze
    if (campaign) {
      const updatedAccounts = campaign.warming_accounts.map(a => ({
        ...a,
        current_status: "FROZEN"
      }));
      setCampaign({
        ...campaign,
        warming_accounts: updatedAccounts,
        recruiter: { ...campaign.recruiter, status: "FROZEN" },
        campaign_metadata: {
          ...campaign.campaign_metadata,
          accounts_frozen: campaign.campaign_metadata.total_accounts_in_campaign,
          accounts_still_warming: 0
        }
      });
    }
  };

  if (!campaign) return <div className="recruiter-map-container"><div className="panel-placeholder">LOADING RECRUITER NETWORK...</div></div>;

  const meta = campaign.campaign_metadata;

  return (
    <div className="recruiter-map-container">
      {/* CAMPAIGN HEADER */}
      <div className="campaign-header">
        <div className="header-left">
          <span className="header-title">RECRUITER NETWORK</span>
          <span className="header-subtitle">CAMPAIGN ID: {campaign.campaign_id}</span>
        </div>

        <div className="header-center">
          <div className={`class-badge ${campaign.recruiter.classification === 'INDUSTRIAL_ORCHESTRATOR' ? 'orchestrator' : 'platform'}`}>
            {campaign.recruiter.classification.replace(/_/g, ' ')}
          </div>
          {campaign.recruiter.classification === 'PLATFORM_SCALE_OPERATION' && (
            <span style={{ fontSize: '9px', color: 'var(--instrument-grey)', marginTop: '4px' }}>
              ⚠ SUPREME COURT WRIT 03/2025 TRIGGER
            </span>
          )}
        </div>

        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">ACCOUNTS IN CAMPAIGN</span>
            <span className="stat-value">{meta.total_accounts_in_campaign}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">STILL WARMING</span>
            <span className="stat-value">{meta.accounts_still_warming}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">RESTRICTED</span>
            <span className="stat-value">{meta.accounts_restricted}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">ESTIMATED FRAUD VALUE</span>
            <span className="stat-value highlight">₹{(meta.estimated_intended_fraud_value / 10000000).toFixed(2)} CR</span>
          </div>
        </div>
      </div>

      <div className="map-body">
        <RecruiterCanvas 
          campaign={campaign}
          selectedNodeId={selectedNodeId}
          onNodeSelect={setSelectedNodeId}
          isFrozen={isFrozen}
        />

        <CampaignPanel 
          campaign={campaign}
          selectedNodeId={selectedNodeId}
          isFrozen={isFrozen}
          onFreeze={handleFreeze}
          onGenerateAutoSTR={(id) => console.log('AutoSTR for:', id)}
          onEscalate={() => console.log('Escalating...')}
        />
      </div>
    </div>
  );
};

export default RecruiterMapView;
