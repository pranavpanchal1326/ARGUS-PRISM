import React, { createContext, useState, useContext } from 'react';

/**
 * ViewContext — shared state for the currently active dashboard view.
 * NavBar reads activeView for the breadcrumb.
 * Sidebar calls setActiveView on item click.
 * Shell wraps children in ViewProvider.
 */
export const ViewContext = createContext({
  activeView:    'Alert Queue',
  setActiveView: () => {},
});

export function ViewProvider({ children }) {
  const [activeView, setActiveView] = useState('Alert Queue');
  return (
    <ViewContext.Provider value={{ activeView, setActiveView }}>
      {children}
    </ViewContext.Provider>
  );
}

/** Convenience hook */
export function useView() {
  return useContext(ViewContext);
}
