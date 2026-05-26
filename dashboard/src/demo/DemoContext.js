import { createContext, useContext } from 'react';
export const DemoContext = createContext(null);
export function useDemoContext() {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    return {
      isDemoMode: false,
      isAutoPlaying: false,
      autoPlayStep: 0,
      focusedAccountId: 'UBI-2026-DEMO-001',
      setFocusedAccountId: () => {},
      enterDemoMode: () => {},
      exitDemoMode: () => {},
      startAutoPlay: () => {},
      stopAutoPlay: () => {},
      resetDemo: () => {},
      goToStep: () => {},
    };
  }
  return ctx;
}

