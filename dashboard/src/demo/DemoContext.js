import { createContext, useContext } from 'react';
export const DemoContext = createContext(null);
export function useDemoContext() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemoContext must be used within DemoContext.Provider');
  return ctx;
}
