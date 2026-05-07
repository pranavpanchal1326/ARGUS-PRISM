import React, { useState, useEffect } from 'react';
import PhosphorLine from './PhosphorLine';
import InstrumentNav from './InstrumentNav';
import ViewTransition from './ViewTransition';
import AlertQueue from '../components/AlertQueue/AlertQueue';
import AccountTimeline from '../views/AccountTimeline/AccountTimeline';
import FlowGraphView from '../views/FlowGraph/FlowGraphView';
import RecruiterMapView from '../views/RecruiterMap/RecruiterMapView';
import AutoSTRPanel from '../components/autostr/AutoSTRPanel';
import LiveThreatBar from '../components/liveBar/LiveThreatBar';
import './DashboardShell.css';

const DashboardShell = ({ demoMode = true }) => {
  const [activeView, setActiveView] = useState('alert-queue');
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [alertCount, setAlertCount] = useState(3);
  const [systemStatus, setSystemStatus] = useState('OPERATIONAL');
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);

  // Simple Event Bus Simulation
  const emit = (event) => {
    if (event === 'alert:new') {
      setSpeedMultiplier(4.0);
      setTimeout(() => setSpeedMultiplier(1.0), 2000);
    }
    if (event === 'campaign:frozen') {
      setSpeedMultiplier(6.0);
      setTimeout(() => setSpeedMultiplier(1.0), 500);
    }
    if (event === 'system:error') {
      setSpeedMultiplier(0.1);
    }
    if (event === 'system:recovered') {
      setSpeedMultiplier(1.0);
    }
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKey = (e) => {
      const views = ['alert-queue', 'account-timeline', 'flow-graph', 'recruiter-map', 'autostr'];
      const currentIndex = views.indexOf(activeView);

      if (e.key === 'ArrowRight') {
        const next = views[(currentIndex + 1) % views.length];
        setActiveView(next);
      }
      if (e.key === 'ArrowLeft') {
        const prev = views[(currentIndex - 1 + views.length) % views.length];
        setActiveView(prev);
      }
      if (e.key === '1') setActiveView('alert-queue');
      if (e.key === '2') setActiveView('account-timeline');
      if (e.key === '3') setActiveView('flow-graph');
      if (e.key === '4') setActiveView('recruiter-map');
      if (e.key === '5') setActiveView('autostr');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeView]);

  // Demo Polling Simulation
  useEffect(() => {
    if (!demoMode) return;
    const interval = setInterval(() => {
      setAlertCount(prev => {
        const next = prev + 1;
        emit('alert:new');
        return next;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [demoMode, alertCount]);

  // Demo Initial Sequence
  useEffect(() => {
    if (!demoMode) return;
    const timeout = setTimeout(() => {
      handleAccountSelect('UBI-2026-DEMO-001');
    }, 5000); // Auto-navigate to demo account after 5s
    return () => clearTimeout(timeout);
  }, [demoMode]);

  useEffect(() => {
    document.title = "ARGUS · PRISM · UNION BANK OF INDIA";
  }, []);

  const handleAccountSelect = (id) => {
    setSelectedAccountId(id);
    setActiveView('account-timeline');
    emit('alert:new');
  };

  const handleAlertAction = (actionType, alertId, accountId) => {
    if (actionType === 'FORENSIC' || actionType === 'TIMELINE') {
      handleAccountSelect(accountId || alertId);
    }
  };

  const renderActiveView = (viewId) => {
    const currentId = selectedAccountId || 'UBI-2026-DEMO-001';
    
    switch (viewId) {
      case 'alert-queue':
        return <AlertQueue onAction={handleAlertAction} />;
      case 'account-timeline':
        return <AccountTimeline accountId={currentId} onClose={() => setActiveView('alert-queue')} />;
      case 'flow-graph':
        return <FlowGraphView accountId={currentId} onViewTimeline={handleAccountSelect} />;
      case 'recruiter-map':
        return <RecruiterMapView accountId={currentId} onViewTimeline={handleAccountSelect} />;
      case 'autostr':
        return <AutoSTRPanel accountId={currentId} />;
      default:
        return <AlertQueue onAction={handleAlertAction} />;
    }
  };

  return (
    <div className="dashboard-shell">
      <PhosphorLine speedMultiplier={speedMultiplier} />
      
      <InstrumentNav 
        activeView={activeView} 
        setActiveView={setActiveView} 
        alertCount={alertCount}
        systemStatus={systemStatus}
      />

      <div className="view-container">
        <ViewTransition activeView={activeView}>
          {(viewId) => (
            <div style={{ height: '100%', width: '100%', position: 'relative' }}>
              {renderActiveView(viewId)}
            </div>
          )}
        </ViewTransition>
      </div>

      <LiveThreatBar />

      {demoMode && (
        <div className="demo-indicator">DEMO · SYNTHETIC DATA</div>
      )}
    </div>
  );
};

export default DashboardShell;
