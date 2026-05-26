import React, { createContext, useState, useContext, useCallback } from 'react';

const VIEW_LABELS = {
  ALERT_QUEUE:      'Alert Queue',
  ACCOUNT_TIMELINE: 'Account Timeline',
  FLOW_GRAPH:       'Flow Graph',
  RECRUITER_MAP:    'Recruiter Map',
  AUTOSTR:          'AutoSTR',
  HEALTH:           'System Health',
};

const VIEW_ORDER = [
  'ALERT_QUEUE',
  'ACCOUNT_TIMELINE',
  'FLOW_GRAPH',
  'RECRUITER_MAP',
  'AUTOSTR',
  'HEALTH',
];

export const ViewContext = createContext({
  currentView:    'ALERT_QUEUE',
  activeView:     'Alert Queue',
  direction:      0,
  navigateToView: () => {},
});

export function ViewProvider({ children }) {
  const [currentView, setCurrentView] = useState('ALERT_QUEUE');
  const [activeView, setActiveView] = useState('Alert Queue');
  const [direction, setDirection] = useState(0);

  const navigateToView = useCallback((newView) => {
    if (newView === currentView) return;
    const ci = VIEW_ORDER.indexOf(currentView);
    const ni = VIEW_ORDER.indexOf(newView);
    setDirection(ni > ci ? 1 : -1);
    setCurrentView(newView);
    setActiveView(VIEW_LABELS[newView] || newView);
  }, [currentView]);

  return (
    <ViewContext.Provider value={{ currentView, activeView, direction, navigateToView }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  return useContext(ViewContext);
}
