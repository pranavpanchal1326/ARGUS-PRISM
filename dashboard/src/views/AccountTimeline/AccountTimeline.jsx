import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, ReferenceDot
} from 'recharts';
import './AccountTimeline.css';

// --- MOCK DATA GENERATOR ---
const generateMockTimeline = () => {
  const timeline = [];
  for (let h = 0; h <= 72; h++) {
    let score = 21;
    if (h >= 12) score = 29;
    if (h >= 24) score = 41;
    if (h >= 36) score = 58;
    if (h >= 48) score = 69;
    if (h >= 60) score = 77;
    if (h >= 66) score = 84;
    if (h >= 71) score = 87;
    if (h === 72) score = 87;

    const signals = [
      { id: 1, name: 'TEST CREDIT PATTERN', fired: h >= 12, value: h >= 12 ? 0.85 : 0.12, description: 'Small amount credits from new account' },
      { id: 2, name: 'DEVICE FINGERPRINT', fired: h >= 24, value: h >= 24 ? 0.92 : 0.05, description: 'IMEI matches known cluster' },
      { id: 3, name: 'VELOCITY DERIVATIVE', fired: h >= 36, value: h >= 36 ? 0.78 : 0.08, description: 'Sudden increase in txn frequency' },
      { id: 4, name: 'DORMANT REACTIVATION', fired: h >= 48, value: h >= 48 ? 0.65 : 0.02, description: 'Old account suddenly active' },
      { id: 5, name: 'FRI CONTRADICTION', fired: h >= 48, value: h >= 48 ? 0.88 : 0.15, description: 'High score for low income profile' },
      { id: 6, name: 'SIM SWAP VELOCITY', fired: h >= 66, value: h >= 66 ? 0.95 : 0.01, description: 'SIM changed twice in 24h' }
    ];

    const events = [];
    if (h === 0) events.push({ type: 'DEVICE_EVENT', label: 'NEW DEVICE REGISTERED: SM-G998B', amount: null, timestamp: '2026-03-21T00:00:00Z' });
    if (h === 12) events.push({ type: 'TRANSACTION', label: 'TEST CREDIT RECEIVED: IMPS/P2P', amount: 50, timestamp: '2026-03-21T12:00:00Z' });
    if (h === 24) events.push({ type: 'TRANSACTION', label: 'TEST CREDIT RECEIVED: UPI', amount: 150, timestamp: '2026-03-22T00:00:00Z' });
    if (h === 60) {
      events.push({ type: 'THRESHOLD', label: 'THRESHOLD 75 CROSSED', amount: null, timestamp: '2026-03-23T12:00:00Z' });
      events.push({ type: 'KYC', label: 'RBI KYC MD S.38 TRIGGERED', amount: null, timestamp: '2026-03-23T12:05:00Z' });
    }
    if (h === 71) {
      events.push({ type: 'THRESHOLD', label: 'THRESHOLD 85 CROSSED', amount: null, timestamp: '2026-03-23T23:00:00Z' });
      events.push({ type: 'RESTRICT', label: 'PMLA S.12 RESTRICTION APPLIED', amount: null, timestamp: '2026-03-23T23:05:00Z' });
    }

    timeline.push({
      hour: h,
      warmth_score: score,
      signals_active: signals,
      events: events
    });
  }

  return {
    account_id: 'UBI-2026-DEMO-9842',
    account_created_at: '2026-03-21T00:00:00Z',
    kyc_profile: {
      declared_occupation: 'VEGETABLE VENDOR',
      declared_income: '₹12,000/MONTH',
      branch: 'MUMBAI CENTRAL (0402)',
      account_type: 'SAVINGS - JAN DHAN'
    },
    fri_score: 'LOW',
    timeline: timeline,
    current_score: 87,
    risk_level: 'CRITICAL', // Final state
    restriction_applied_at_hour: 71,
    autostr_initiated_at_hour: 71
  };
};

const DATA = generateMockTimeline();

// --- SUB-COMPONENTS ---

const AccountHeader = ({ accountData, currentScore, riskLevel, isInverted }) => {
  const getRiskColor = (score) => {
    if (isInverted) return 'var(--void)';
    if (score >= 60) return 'var(--phosphor)';
    return 'var(--instrument-white)';
  };

  const getScoreStyle = (score) => {
    const style = { color: getRiskColor(score), transition: 'color 0.2s steps(2)' };
    if (score >= 75 && score < 85 && !isInverted) {
      style.filter = 'brightness(1.2)';
    }
    return style;
  };

  return (
    <div className={`account-header ${isInverted ? 'inverted' : ''}`}>
      <div className="header-block">
        <span className="header-label">ACCOUNT TIMELINE</span>
        <span className="header-value-mono">{accountData.account_id}</span>
        <span className="header-value-grey">CREATED: {accountData.account_created_at}</span>
      </div>

      <div className="center-block">
        <div className="score-display" style={getScoreStyle(currentScore)}>
          {currentScore.toString().padStart(2, '0')}
        </div>
        <span className="risk-label">{riskLevel} RISK PROFILE</span>
      </div>

      <div className="kyc-grid">
        <div className="header-block">
          <span className="header-label">OCCUPATION</span>
          <span className="header-value-mono">{accountData.kyc_profile.declared_occupation}</span>
        </div>
        <div className="header-block">
          <span className="header-label">INCOME</span>
          <span className="header-value-mono">{accountData.kyc_profile.declared_income}</span>
        </div>
        <div className="header-block">
          <span className="header-label">BRANCH</span>
          <span className="header-value-mono">{accountData.kyc_profile.branch}</span>
        </div>
        <div className="header-block">
          <span className="header-label">FRI SCORE</span>
          <span className="header-value-mono" style={{ color: !isInverted && accountData.fri_score === 'LOW' ? 'var(--phosphor)' : 'inherit' }}>
            {accountData.fri_score}
          </span>
        </div>
      </div>
    </div>
  );
};

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined) return null;

  const score = payload.warmth_score;
  const hasEvent = payload.events && payload.events.length > 0;
  const isThreshold = score === 75 || score === 85 || (payload.hour === 60 || payload.hour === 71);

  let size = 3;
  let fill = 'var(--phosphor)';
  let stroke = 'none';

  if (hasEvent) size = 6;
  if (isThreshold) {
    size = 8;
    fill = 'var(--void)';
    stroke = 'var(--phosphor)';
  }

  return (
    <rect 
      x={cx - size/2} 
      y={cy - size/2} 
      width={size} 
      height={size} 
      fill={fill} 
      stroke={stroke}
      strokeWidth={isThreshold ? 1 : 0}
    />
  );
};

const WarmthChart = ({ timelineData, currentHour }) => {
  const visibleData = useMemo(() => 
    timelineData.slice(0, currentHour + 1), 
    [timelineData, currentHour]
  );

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={visibleData} margin={{ top: 40, right: 40, left: 20, bottom: 20 }}>
          <CartesianGrid stroke="var(--instrument-ghost)" strokeDasharray="2 4" vertical={false} />
          <XAxis 
            dataKey="hour" 
            domain={[0, 72]} 
            type="number"
            ticks={[0, 12, 24, 36, 48, 60, 72]}
            stroke="var(--instrument-grey)"
            tick={{ fontFamily: 'Suisse Int\'l Mono', fontSize: 10 }}
          />
          <YAxis 
            domain={[0, 100]} 
            stroke="var(--instrument-grey)"
            tick={{ fontFamily: 'Suisse Int\'l Mono', fontSize: 10 }}
          />
          
          <ReferenceLine y={40} stroke="var(--instrument-dark)" strokeDasharray="4 4" label={{ value: 'WARMING', position: 'right', fill: 'var(--instrument-grey)', className: 'recharts-reference-line-label' }} />
          <ReferenceLine y={60} stroke="var(--instrument-grey)" strokeDasharray="4 4" label={{ value: 'HOT', position: 'right', fill: 'var(--instrument-grey)', className: 'recharts-reference-line-label' }} />
          <ReferenceLine y={75} stroke="var(--phosphor)" strokeDasharray="2 2" label={{ value: 'RBI KYC MD S.38', position: 'right', fill: 'var(--phosphor)', className: 'recharts-reference-line-label' }} />
          <ReferenceLine y={85} stroke="var(--phosphor)" strokeWidth={2} label={{ value: 'PMLA S.12', position: 'right', fill: 'var(--phosphor)', className: 'recharts-reference-line-label' }} />
          
          <ReferenceLine x={currentHour} stroke="var(--phosphor)" strokeWidth={1} />

          <Line 
            type="monotone" 
            dataKey="warmth_score" 
            stroke="var(--phosphor)" 
            strokeWidth={2} 
            dot={<CustomDot />}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const PlaybackControls = ({ isPlaying, speed, onPlay, onPause, onReset, onSpeedChange }) => {
  return (
    <div className="playback-controls-row">
      <div className="controls-group">
        <button className={`playback-btn ${isPlaying ? 'active' : ''}`} onClick={onPlay}>▶ PLAYBACK</button>
        <button className={`playback-btn ${!isPlaying ? 'active' : ''}`} onClick={onPause}>⏸ PAUSE</button>
        <button className="playback-btn" onClick={onReset}>↺ RESET</button>
      </div>

      <div className="speed-selector">
        <span className="speed-label">SPEED</span>
        <div className="controls-group">
          {[1, 2, 4].map(s => (
            <button 
              key={s} 
              className={`playback-btn ${speed === s ? 'active' : ''}`}
              onClick={() => onSpeedChange(s)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const SignalPanel = ({ signals, currentHour }) => {
  return (
    <div className="panel-column left-column">
      <div className="panel-title">SIGNAL STATUS</div>
      <div className="panel-content">
        {signals.map(sig => {
          const isFired = sig.fired;
          // Only show fired if the hour has reached the fire point
          const hasReachedFirePoint = (sig.id === 1 && currentHour >= 12) || 
                                      (sig.id === 2 && currentHour >= 24) ||
                                      (sig.id === 3 && currentHour >= 36) ||
                                      ((sig.id === 4 || sig.id === 5) && currentHour >= 48) ||
                                      (sig.id === 6 && currentHour >= 66);
          
          const isFiredActual = isFired && hasReachedFirePoint;

          return (
            <div key={sig.id} className={`signal-row ${isFiredActual ? 'fired' : ''}`}>
              <div className="signal-info">
                <span className="signal-num">SIG_{sig.id.toString().padStart(2, '0')}</span>
                <span className="signal-name">{sig.name}</span>
              </div>
              <div className="signal-bar-track">
                <div 
                  className="signal-bar-fill" 
                  style={{ width: `${isFiredActual ? sig.value * 100 : 0}%`, background: isFiredActual ? 'var(--phosphor)' : 'var(--instrument-dark)' }}
                />
              </div>
              <div className="signal-meta">
                <span className={`signal-value ${isFiredActual ? 'active' : ''}`}>{isFiredActual ? sig.value.toFixed(2) : '0.00'}</span>
                {isFiredActual && <span className="fired-indicator">● FIRED</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TeletypeLabel = ({ text, onComplete }) => {
  const [displayed, setDisplayed] = useState('');
  const completeRef = useRef(false);

  useEffect(() => {
    let current = '';
    const interval = setInterval(() => {
      if (current.length < text.length) {
        current += text[current.length];
        setDisplayed(current);
      } else {
        clearInterval(interval);
        if (!completeRef.current && onComplete) {
          completeRef.current = true;
          onComplete();
        }
      }
    }, 35);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && <span className="teletype-cursor" />}
    </span>
  );
};

const EventLog = ({ revealedEvents }) => {
  return (
    <div className="panel-column right-column">
      <div className="panel-title">EVENT LOG</div>
      <div className="panel-content">
        {[...revealedEvents].reverse().map((event, idx) => (
          <div key={`${event.timestamp}-${idx}`} className="event-row just-revealed">
            <div className="event-hour">H+{event.hour}</div>
            <div className={`event-badge ${event.type === 'THRESHOLD' || event.type === 'RESTRICT' ? 'priority' : ''}`}>
              {event.type.split('_')[0]}
            </div>
            <div className="event-label">
              <TeletypeLabel text={event.label} />
            </div>
            {event.amount && <div className="event-amount">₹{event.amount}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- MAIN VIEW ---

const AccountTimeline = ({ accountId = 'UBI-2026-DEMO-9842' }) => {
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [displayScore, setDisplayScore] = useState(DATA.timeline[0].warmth_score);
  const [revealedEvents, setRevealedEvents] = useState([]);
  
  const scoreScanIntervalRef = useRef(null);
  const hasAutoPlayed = useRef(false);

  // Risk level logic
  const getRiskLevel = (score) => {
    if (score >= 85) return 'IMMINENT';
    if (score >= 75) return 'CRITICAL';
    if (score >= 60) return 'HOT';
    if (score >= 40) return 'WARMING';
    return 'CLEAN';
  };

  const currentData = DATA.timeline[currentHour];
  const currentRisk = getRiskLevel(displayScore);
  const isInverted = displayScore >= 85;

  // Auto-play on mount: 3 seconds to reach hour 72
  useEffect(() => {
    if (!hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      const duration = 3000;
      const intervalTime = duration / 72;
      
      const autoInterval = setInterval(() => {
        setCurrentHour(prev => {
          if (prev < 72) return prev + 1;
          clearInterval(autoInterval);
          return prev;
        });
      }, intervalTime);
    }
  }, []);

  // Playback engine
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentHour(prev => {
          if (prev < 72) return prev + 1;
          setIsPlaying(false);
          return prev;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Handle hour change: scanning and events
  useEffect(() => {
    const targetScore = DATA.timeline[currentHour].warmth_score;
    
    // 1. Number scanning
    clearInterval(scoreScanIntervalRef.current);
    const start = Date.now();
    scoreScanIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed < 240) {
        setDisplayScore(Math.floor(Math.random() * 100));
      } else {
        clearInterval(scoreScanIntervalRef.current);
        setDisplayScore(targetScore);
      }
    }, 20);

    // 2. Reveal events
    const hourEvents = DATA.timeline[currentHour].events.map(e => ({ ...e, hour: currentHour }));
    if (hourEvents.length > 0) {
      setRevealedEvents(prev => {
        // Prevent duplicate events if replaying/scrubbing
        const existing = new Set(prev.map(p => `${p.hour}-${p.label}`));
        const newEvents = hourEvents.filter(e => !existing.has(`${e.hour}-${e.label}`));
        return [...prev, ...newEvents];
      });
    }

  }, [currentHour]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentHour(0);
    setDisplayScore(DATA.timeline[0].warmth_score);
    setRevealedEvents([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--void)' }}>
      <AccountHeader 
        accountData={DATA} 
        currentScore={displayScore} 
        riskLevel={currentRisk} 
        isInverted={isInverted}
      />
      
      <WarmthChart 
        timelineData={DATA.timeline} 
        currentHour={currentHour} 
      />

      <PlaybackControls 
        isPlaying={isPlaying} 
        speed={playbackSpeed} 
        onPlay={() => setIsPlaying(true)} 
        onPause={() => setIsPlaying(false)} 
        onReset={handleReset} 
        onSpeedChange={setPlaybackSpeed}
      />

      <div className="timeline-panels">
        <SignalPanel 
          signals={currentData.signals_active} 
          currentHour={currentHour} 
        />
        <EventLog 
          revealedEvents={revealedEvents} 
        />
      </div>
    </div>
  );
};

export default AccountTimeline;
