import React, { useState } from 'react';

const CampaignPanel = ({ 
  campaign, 
  selectedNodeId, 
  onFreeze, 
  onGenerateAutoSTR, 
  onEscalate, 
  isFrozen 
}) => {
  const [freezeConfirm, setFreezeConfirm] = useState(false);
  const [escalateConfirm, setEscalateConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedNode = selectedNodeId 
    ? campaign.warming_accounts.find(a => a.id === selectedNodeId)
    : null;

  const recruiter = campaign.recruiter;
  const meta = campaign.campaign_metadata;

  const handleFreezeClick = () => {
    if (isFrozen) return;
    setFreezeConfirm(true);
  };

  const handleEscalateClick = () => {
    setEscalateConfirm(true);
  };

  const handleAutoSTRClick = () => {
    setIsGenerating(true);
    onGenerateAutoSTR(campaign.campaign_id);
    setTimeout(() => setIsGenerating(false), 3000);
  };

  const ProgressBar = ({ label, count, total, color, inverted = false }) => {
    const width = (count / total) * 100;
    return (
      <div className="progress-group">
        <div className="progress-header">
          <span className="progress-label">{label}</span>
          <span className="progress-count">{count} / {total}</span>
        </div>
        <div className="bar-track">
          <div 
            className="bar-fill" 
            style={{ 
              width: `${width}%`, 
              background: color,
              border: inverted ? '1px solid var(--void)' : 'none'
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="panel-area">
      {/* SECTION A: RECRUITER PROFILE */}
      <div className="panel-section">
        <div className="section-title">RECRUITER PROFILE</div>
        <div className="recruiter-id">{recruiter.id}</div>
        
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div className="stat-label">WARMTHSCORE</div>
            <div className="fraud-val" style={{ fontSize: '28px', color: 'var(--instrument-white)' }}>
              {recruiter.warmth_score}
            </div>
            <div className="progress-label" style={{ color: 'var(--instrument-grey)' }}>FRI: LOW ⚠</div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="stat-label">ACCOUNTS RECRUITED</div>
            <div className="stat-value" style={{ fontSize: '18px' }}>{recruiter.accounts_recruited}</div>
          </div>
        </div>

        <div className="callout-box">
          <div className="callout-text">
            FRI CLASSIFIES THIS NUMBER AS LOW RISK. PRISM IDENTIFIES IT AS THE CAMPAIGN COORDINATOR BASED ON NETWORK TOPOLOGY.
            <br/><br/>
            NETWORK FUNCTION: RECRUITER
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div className="stat-label">START</div>
            <div className="stat-value" style={{ fontSize: '10px' }}>{new Date(recruiter.campaign_start).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="stat-label">DURATION</div>
            <div className="stat-value" style={{ fontSize: '10px' }}>{recruiter.campaign_duration_hours}H</div>
          </div>
          <div>
            <div className="stat-label">TEST PAYMENTS</div>
            <div className="stat-value" style={{ fontSize: '10px' }}>{recruiter.test_payments_sent} TXNS</div>
          </div>
          <div>
            <div className="stat-label">TEST VALUE</div>
            <div className="stat-value" style={{ fontSize: '10px' }}>₹{recruiter.total_test_value.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* SECTION B: CAMPAIGN STATUS */}
      <div className="panel-section">
        <div className="section-title">CAMPAIGN STATUS</div>
        
        <ProgressBar 
          label="STILL WARMING" 
          count={meta.accounts_still_warming} 
          total={meta.total_accounts_in_campaign} 
          color="var(--instrument-grey)" 
        />
        <ProgressBar 
          label="RESTRICTED" 
          count={meta.accounts_restricted} 
          total={meta.total_accounts_in_campaign} 
          color="var(--phosphor)" 
          style={{ opacity: 0.5 }}
        />
        <ProgressBar 
          label="FROZEN" 
          count={meta.accounts_frozen} 
          total={meta.total_accounts_in_campaign} 
          color="var(--phosphor)" 
        />
        <ProgressBar 
          label="CONFIRMED MULE" 
          count={4} // Hardcoded for mock
          total={meta.total_accounts_in_campaign} 
          color="var(--phosphor)" 
          inverted={true}
        />

        <div style={{ marginTop: '24px' }}>
          <div className="stat-label">ESTIMATED FRAUD PREVENTED</div>
          <div className="fraud-val">₹{(meta.estimated_intended_fraud_value / 10000000).toFixed(2)} CR</div>
          <div className="progress-label">IF CAMPAIGN NOT DETECTED</div>
        </div>
      </div>

      {/* SECTION C: ACTIONS */}
      <div className="panel-section" style={{ borderBottom: 'none' }}>
        <div className="section-title">CAMPAIGN ACTIONS</div>
        
        <div className="action-stack">
          {!isFrozen ? (
            <>
              <button className="campaign-btn freeze" onClick={handleFreezeClick}>
                ▣ FREEZE ENTIRE CAMPAIGN
              </button>
              {freezeConfirm && (
                <div className="callout-box" style={{ marginTop: 0, borderStyle: 'dashed' }}>
                  <div className="progress-label" style={{ color: 'var(--phosphor)', marginBottom: 8 }}>
                    CONFIRM FREEZE — THIS ACTION FREEZES {meta.total_accounts_in_campaign} ACCOUNTS
                  </div>
                  <div className="confirm-actions">
                    <button className="confirm-btn" onClick={() => { onFreeze(); setFreezeConfirm(false); }}>CONFIRM</button>
                    <button className="cancel-btn" onClick={() => setFreezeConfirm(false)}>CANCEL</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <button className="campaign-btn" style={{ borderColor: 'var(--instrument-dark)', color: 'var(--instrument-grey)', cursor: 'not-allowed' }}>
              ✓ CAMPAIGN FROZEN
            </button>
          )}

          <button className="campaign-btn" onClick={handleAutoSTRClick} disabled={isGenerating}>
            ⬛ GENERATE AUTOSTR — ALL ACCOUNTS
          </button>
          {isGenerating && <div className="legal-note" style={{ color: 'var(--instrument-grey)' }}>GENERATING {meta.total_accounts_in_campaign} STR PACKAGES...</div>}

          <button className="campaign-btn" onClick={() => console.log('Exporting...')}>
            📋 EXPORT CAMPAIGN EVIDENCE
          </button>

          <button className="campaign-btn" onClick={handleEscalateClick}>
            ↗ ESCALATE TO FIU-IND
          </button>
          {escalateConfirm && (
            <div className="callout-box" style={{ marginTop: 0, borderStyle: 'dashed' }}>
              <div className="progress-label" style={{ color: 'var(--instrument-white)', marginBottom: 8 }}>
                CONFIRM ESCALATION TO FINANCIAL INTELLIGENCE UNIT
              </div>
              <div className="confirm-actions">
                <button className="confirm-btn" onClick={() => { onEscalate(); setEscalateConfirm(false); }}>CONFIRM</button>
                <button className="cancel-btn" onClick={() => setEscalateConfirm(false)}>CANCEL</button>
              </div>
            </div>
          )}
        </div>

        <div className="legal-note">
          FREEZE AUTHORITY: RBI KYC MD 2016 S.38<br/>
          STR MANDATE: PMLA S.12<br/>
          ESCALATION BASIS: SC WRIT 03/2025
        </div>
      </div>
    </div>
  );
};

export default CampaignPanel;
