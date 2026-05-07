import React, { useState, useEffect } from 'react';
import LiveThreatBar from '../components/liveBar/LiveThreatBar';
import AlertQueue from '../components/alertQueue/AlertQueue';
import AccountTimeline from './AccountTimeline/AccountTimeline';
import FlowGraphView from './FlowGraph/FlowGraphView';
import RecruiterMapView from './RecruiterMap/RecruiterMapView';

const VIEWS = {
  ALERTS: 'ALERTS',
  TIMELINE: 'TIMELINE',
  FLOW: 'FLOW',
  RECRUITER: 'RECRUITER'
};

const DashboardShell = () => {
  const [activeView, setActiveView] = useState(VIEWS.ALERTS);
  const [glitching, setGlitching] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '1') switchView(VIEWS.ALERTS);
      if (e.key === '2') switchView(VIEWS.TIMELINE);
      if (e.key === '3') switchView(VIEWS.FLOW);
      if (e.key === '4') switchView(VIEWS.RECRUITER);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const switchView = (view) => {
    if (view === activeView) return;
    setGlitching(true);
    setTimeout(() => {
      setActiveView(view);
      setGlitching(false);
    }, 150);
  };

  const handleAlertSelect = (id) => {
    setSelectedAccountId(id);
    switchView(VIEWS.TIMELINE);
  };

  return (
    <div className={`dashboard-root ${glitching ? 'glitching' : ''}`}>
      <LiveThreatBar />
      
      <main className="main-content">
        {activeView === VIEWS.ALERTS && (
          <AlertQueue onSelectAlert={handleAlertSelect} />
        )}
        
        {activeView === VIEWS.TIMELINE && (
          <AccountTimeline 
            accountId={selectedAccountId || 'UBI-2026-DEMO-01'} 
            onClose={() => switchView(VIEWS.ALERTS)}
          />
        )}
        
        {activeView === VIEWS.FLOW && (
          <FlowGraphView 
            accountId={selectedAccountId || 'UBI-2026-DEMO-01'} 
          />
        )}
        
        {activeView === VIEWS.RECRUITER && (
          <RecruiterMapView />
        )}
      </main>

      {/* Global View Nav Indicator */}
      <nav className="global-nav">
        <button onClick={() => switchView(VIEWS.ALERTS)} className={activeView === VIEWS.ALERTS ? 'active' : ''}>[1] QUEUE</button>
        <button onClick={() => switchView(VIEWS.TIMELINE)} className={activeView === VIEWS.TIMELINE ? 'active' : ''}>[2] FORENSIC</button>
        <button onClick={() => switchView(VIEWS.FLOW)} className={activeView === VIEWS.FLOW ? 'active' : ''}>[3] NETWORK</button>
        <button onClick={() => switchView(VIEWS.RECRUITER)} className={activeView === VIEWS.RECRUITER ? 'active' : ''}>[4] RECRUITER</button>
      </nav>

      <style jsx>{`
        .dashboard-root {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--void);
          overflow: hidden;
        }

        .main-content {
          flex: 1;
          min-height: 0;
          position: relative;
        }

        .glitching {
          filter: contrast(1.5) brightness(1.2);
          transform: skewX(0.5deg);
        }

        .global-nav {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          gap: 12px;
          z-index: 1000;
        }

        .global-nav button {
          background: rgba(12, 12, 9, 0.8);
          border: 1px solid var(--instrument-dark);
          color: var(--instrument-grey);
          padding: 6px 12px;
          font-family: 'Suisse Int\'l Mono', monospace;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.2s steps(2);
        }

        .global-nav button:hover {
          border-color: var(--instrument-white);
          color: var(--instrument-white);
        }

        .global-nav button.active {
          border-color: var(--phosphor);
          color: var(--phosphor);
          background: var(--instrument-ghost);
        }
      `}</style>
    </div>
  );
};

export default DashboardShell;
