import React, { useState, useEffect } from 'react';

const InstrumentNav = ({ 
  activeView, 
  setActiveView, 
  alertCount, 
  systemStatus = 'OPERATIONAL' 
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', { hour12: false });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }).toUpperCase();
  };

  const views = [
    { id: 'alert-queue', label: 'ALERT QUEUE' },
    { id: 'account-timeline', label: 'ACCOUNT TIMELINE' },
    { id: 'flow-graph', label: 'FLOW GRAPH' },
    { id: 'recruiter-map', label: 'RECRUITER MAP' },
    { id: 'autostr', label: 'AUTOSTR' }
  ];

  return (
    <nav className="instrument-nav">
      {/* LEFT: WORDMARK */}
      <div className="nav-left">
        <div className="argus-wordmark">ARGUS</div>
        <div className="system-designation">
          <div className="prism-label">PRISM</div>
          <div className="designation-text">PRE-CRIME INTELLIGENCE SYSTEM</div>
          <div className="ambient-meta">UNION BANK OF INDIA · iDEA 2.0 · PS3</div>
        </div>
      </div>

      {/* CENTER: VIEW SELECTORS */}
      <div className="nav-center">
        {views.map((view) => (
          <button
            key={view.id}
            className={`view-selector ${activeView === view.id ? 'active' : ''}`}
            onClick={() => setActiveView(view.id)}
          >
            {view.label}
            {view.id === 'alert-queue' && alertCount > 0 && (
              <span className="alert-badge">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* RIGHT: STATUS & CLOCK */}
      <div className="nav-right">
        <div className="nav-right-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`status-indicator ${systemStatus.toLowerCase()}`} />
            <span className="status-label">{systemStatus}</span>
          </div>
          <div className="status-sublabel">
            {systemStatus === 'OPERATIONAL' ? 'ALL ENGINES NOMINAL' : 'SYSTEM DEGRADED'}
          </div>
        </div>

        <div className="nav-right-block">
          <div className="active-count-val" style={{ 
            color: alertCount > 5 ? 'var(--phosphor)' : alertCount > 0 ? 'var(--instrument-white)' : 'var(--instrument-dark)' 
          }}>
            {alertCount.toString().padStart(2, '0')}
          </div>
          <div className="status-label">ACTIVE ALERTS</div>
        </div>

        <div className="nav-right-block">
          <div className="live-clock">{formatTime(time)}</div>
          <div className="live-date">{formatDate(time)}</div>
          <div className="live-tz">IST +05:30</div>
        </div>
      </div>
    </nav>
  );
};

export default InstrumentNav;
