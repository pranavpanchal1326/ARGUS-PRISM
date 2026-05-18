import React, { useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import NavBar              from './NavBar';
import Sidebar             from './Sidebar';
import { ViewProvider, useView } from './ViewContext';
import { AutoPlayController } from '../demo/AutoPlayController';
import { useDemoContext } from '../demo/DemoContext';
import './ViewTransition.css';

/* ── View imports ─────────────────────────────────────────── */
import AlertQueueView      from '../views/AlertQueue';
import AccountTimelineView from '../views/AccountTimeline';
import FlowGraphView       from '../views/FlowGraph';
import RecruiterMapView    from '../views/RecruiterMap';
import AutoSTRView         from '../views/AutoSTR';

/* ── Constants ────────────────────────────────────────────── */
const VIEW_ORDER = [
  'ALERT_QUEUE',
  'ACCOUNT_TIMELINE',
  'FLOW_GRAPH',
  'RECRUITER_MAP',
  'AUTOSTR',
];

const VIEW_LABELS = {
  ALERT_QUEUE:      'Alert Queue',
  ACCOUNT_TIMELINE: 'Account Timeline',
  FLOW_GRAPH:       'Flow Graph',
  RECRUITER_MAP:    'Recruiter Map',
  AUTOSTR:          'AutoSTR',
};

/* ── Slide variants ──────────────────────────────────────── */
const viewVariants = {
  enter:  (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center:          { x: 0,                            opacity: 1 },
  exit:   (dir) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
};

/* ── View renderer ───────────────────────────────────────── */
function renderView(view) {
  switch (view) {
    case 'ALERT_QUEUE':      return <AlertQueueView />;
    case 'ACCOUNT_TIMELINE': return <AccountTimelineView />;
    case 'FLOW_GRAPH':       return <FlowGraphView />;
    case 'RECRUITER_MAP':    return <RecruiterMapView />;
    case 'AUTOSTR':          return <AutoSTRView />;
    default:                 return <AlertQueueView />;
  }
}

/* ─────────────────────────────────────────────────────────
   ShellContent — reads from ViewProvider via useView so
   NavBar breadcrumb and ShellContent share one source of truth.
   ───────────────────────────────────────────────────────── */
function ShellContent() {
  const { setActiveView }                       = useView();
  const [currentView, setCurrentView]           = useState('ALERT_QUEUE');
  const directionRef                            = useRef(0);

  /* Direction must update synchronously (useRef) before the
     render triggered by setCurrentView so AnimatePresence
     reads the correct custom value on the same frame.       */
  const handleNavigate = useCallback((newView) => {
    if (newView === currentView) return;
    const ci = VIEW_ORDER.indexOf(currentView);
    const ni = VIEW_ORDER.indexOf(newView);
    directionRef.current = ni > ci ? 1 : -1;
    setCurrentView(newView);
    setActiveView(VIEW_LABELS[newView]); /* sync NavBar breadcrumb */
  }, [currentView, setActiveView]);

  const { isDemoMode } = useDemoContext();
  const bannerOffset = isDemoMode ? 36 : 0;

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100vh',
      background:    'var(--bg-base)',
      overflow:      'hidden',
    }}>
      {/* Fixed top bar */}
      <NavBar />

      {/* AutoPlayController — renders null, drives view on auto-play step */}
      <AutoPlayController onNavigate={handleNavigate} />

      {/* Body row — below nav (+ demo banner offset when active) */}
      <div style={{
        display:   'flex',
        flex:      1,
        overflow:  'hidden',
        marginTop: `${56 + bannerOffset}px`,
      }}>
        {/* Fixed sidebar — receives nav state via props */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
        />

        {/* Scrollable main area */}
        <main style={{
          marginLeft: '220px', /* clears fixed Sidebar */
          flex:       1,
          overflowY:  'auto',
          padding:    '32px',
          background: 'var(--bg-base)',
        }}>
          <div className="view-transition-wrapper">
            <AnimatePresence mode="popLayout" custom={directionRef.current}>
              <motion.div
                key={currentView}
                className="motion-view"
                custom={directionRef.current}
                variants={viewVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                {renderView(currentView)}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Shell — public export. ViewProvider wraps ShellContent so
   both NavBar (breadcrumb via useView) and ShellContent
   (setActiveView sync) share the same context instance.
   ───────────────────────────────────────────────────────── */
export default function Shell() {
  return (
    <ViewProvider>
      <ShellContent />
    </ViewProvider>
  );
}
