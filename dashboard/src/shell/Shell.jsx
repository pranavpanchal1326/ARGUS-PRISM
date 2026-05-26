import React, { useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import NavBar              from './NavBar';
import Sidebar             from './Sidebar';
import { ViewProvider, useView } from './ViewContext';
import { useDemoContext } from '../demo/DemoContext';
import './ViewTransition.css';

/* ── View imports ─────────────────────────────────────────── */
import AlertQueueView      from '../views/AlertQueue';
import AccountTimelineView from '../views/AccountTimeline';
import FlowGraphView       from '../views/FlowGraph';
import RecruiterMapView    from '../views/RecruiterMap';
import AutoSTRView         from '../views/AutoSTR';
import HealthView          from '../views/Health/HealthView';

/* ── Constants ────────────────────────────────────────────── */
const VIEW_ORDER = [
  'ALERT_QUEUE',
  'ACCOUNT_TIMELINE',
  'FLOW_GRAPH',
  'RECRUITER_MAP',
  'AUTOSTR',
  'HEALTH',
];

const VIEW_LABELS = {
  ALERT_QUEUE:      'Alert Queue',
  ACCOUNT_TIMELINE: 'Account Timeline',
  FLOW_GRAPH:       'Flow Graph',
  RECRUITER_MAP:    'Recruiter Map',
  AUTOSTR:          'AutoSTR',
  HEALTH:           'System Health',
};

/* ── Slide variants ──────────────────────────────────────── */
const viewVariants = {
  enter:  (dir) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center:          { x: 0,                            opacity: 1 },
  exit:   (dir) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
};

/* ── View renderer ───────────────────────────────────────── */
function renderView(view, focusedAccountId) {
  switch (view) {
    case 'ALERT_QUEUE':      return <AlertQueueView />;
    case 'ACCOUNT_TIMELINE': return <AccountTimelineView accountId={focusedAccountId} />;
    case 'FLOW_GRAPH':       return <FlowGraphView accountId={focusedAccountId} />;
    case 'RECRUITER_MAP':    return <RecruiterMapView />;
    case 'AUTOSTR':          return <AutoSTRView accountId={focusedAccountId} />;
    case 'HEALTH':           return <HealthView />;
    default:                 return <AlertQueueView />;
  }
}

/* ─────────────────────────────────────────────────────────
   ShellContent — reads from ViewContext via useView so
   NavBar breadcrumb and ShellContent share one source of truth.
   ───────────────────────────────────────────────────────── */
function ShellContent() {
  const { currentView, direction, navigateToView } = useView();
  const { focusedAccountId } = useDemoContext();

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

      {/* Body row — below nav */}
      <div style={{
        display:   'flex',
        flex:      1,
        overflow:  'hidden',
        marginTop: '56px',
      }}>
        {/* Fixed sidebar — receives nav state via props */}
        <Sidebar
          currentView={currentView}
          onNavigate={navigateToView}
        />

        {/* Scrollable main area */}
        <main style={{
          marginLeft: '220px', /* clears fixed Sidebar */
          flex:       1,
          overflowY:  'auto',
          padding:    '32px',
          background: 'var(--bg-base)',
        }}>
          <div className="view-transition-wrapper" style={{ transition: 'opacity 0.15s ease' }}>
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={currentView}
                className="motion-view"
                custom={direction}
                variants={viewVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                {renderView(currentView, focusedAccountId)}
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
