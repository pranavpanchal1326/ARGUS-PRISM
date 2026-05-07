import React, { useState, useEffect, useCallback } from 'react';
import WarmthChart from './WarmthChart';
import SignalEventMarkers from './SignalEventMarkers';
import FRIBadge from './FRIBadge';
import { fetchAccountTimeline } from '../../api/client';
import useNumberScanner from '../../hooks/useNumberScanner';
import './AccountTimeline.css';

const AccountTimeline = () => {
  const [selectedAccountId, setSelectedAccountId] = useState('UBI-2026-DEMO-001');
  const [timeline, setTimeline] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [chartBounds, setChartBounds] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const mockAccounts = [
    'UBI-2026-DEMO-001',
    'UBI-4491-8832-1120',
    'UBI-8892-1102-4431'
  ];

  const loadTimeline = useCallback(async (id) => {
    setIsLoading(true);
    try {
      const data = await fetchAccountTimeline(id);
      setTimeline(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTimeline(selectedAccountId);
  }, [selectedAccountId, loadTimeline]);

  const handleReplay = () => {
    setIsReplaying(true);
    setTimeout(() => setIsReplaying(false), 2000);
  };

  const currentScoreScanner = useNumberScanner(timeline?.current_score || 0, 800);

  if (isLoading && !timeline) {
    return (
      <div className="account-timeline">
        <div className="loading-state" style={{ padding: '48px' }}>
          <div className="breathing-line" style={{ height: '1px', backgroundColor: 'var(--phosphor)', animation: 'phosphorBreathe 1s infinite' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="account-timeline">
        <div className="error-state" style={{ padding: '48px', color: 'var(--instrument-grey)' }}>
          <p className="font-ui">TIMELINE FEED INTERRUPTED</p>
          <p className="font-data" style={{ margin: '12px 0' }}>{selectedAccountId}</p>
          <button 
            className="font-ui phosphor-text" 
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => loadTimeline(selectedAccountId)}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-timeline">
      {/* Row 1: Header */}
      <header className="account-timeline__header">
        <span className="font-ui ghost-text" style={{ fontSize: '10px' }}>ACCOUNT TIMELINE</span>
        
        <div className="header-controls" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div className="account-selector" onClick={() => setShowDropdown(!showDropdown)}>
            <div className="account-selector__trigger">
              {selectedAccountId}
              <span style={{ fontSize: '8px' }}>▼</span>
            </div>
            {showDropdown && (
              <div className="account-selector__dropdown">
                {mockAccounts.map(id => (
                  <div 
                    key={id} 
                    className={`account-selector__option ${selectedAccountId === id ? 'account-selector__option--selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAccountId(id);
                      setShowDropdown(false);
                    }}
                  >
                    {id}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            className={`replay-btn ${isReplaying ? 'replay-btn--active' : ''}`}
            onClick={handleReplay}
            disabled={isReplaying}
          >
            {isReplaying ? (
              <span>REPLAYING<span className="cursor-blink">·</span></span>
            ) : 'REPLAY'}
          </button>
        </div>
      </header>

      {/* Row 2: Stats Bar */}
      {timeline && (
        <div className="account-timeline__stats-bar">
          <div className="stat-block">
            <div className="stat-label">WARMTHSCORE</div>
            <div className={`stat-value ${timeline.current_score >= 75 ? 'phosphor-text' : ''}`}>
              {currentScoreScanner.displayValue.toFixed(1)}
            </div>
          </div>
          <div className={`stat-block ${timeline.severity === 'IMMINENT' ? 'stat-block--imminent' : ''}`}>
            <div className="stat-label">SEVERITY</div>
            <div className="stat-value" style={{ fontSize: '24px' }}>{timeline.severity}</div>
          </div>
          <div className="stat-block">
            <div className="stat-label">MONITORING WINDOW</div>
            <div className="stat-value font-data" style={{ fontSize: '24px' }}>72H 00M</div>
          </div>
          <div className="stat-block" style={{ borderRight: 'none', position: 'relative' }}>
            <div className="stat-label">FRI INDICATOR</div>
            <div className="stat-value font-data" style={{ fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {timeline.fri_score}
              {timeline.fri_score === 'LOW' && timeline.current_score >= 75 && (
                <span className="phosphor-text" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>· CONTRADICTS</span>
              )}
            </div>
            <div className="sync-status font-data phosphor-text">
              ● LIVE_SYNC
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Chart Area */}
      <main className="account-timeline__chart-area">
        <div className="chart-noise-overlay" />
        {timeline && (
          <>
            <WarmthChart 
              data={timeline.data} 
              isReplaying={isReplaying} 
              onChartReady={setChartBounds}
            />
            <SignalEventMarkers 
              data={timeline.data} 
              bounds={chartBounds}
            />
            <FRIBadge 
              score={timeline.fri_score} 
              warmthScore={timeline.current_score}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default AccountTimeline;
