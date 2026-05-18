import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import GrainFilter from './design/GrainFilter';
import { PaperGrain } from './design/PaperGrain';
import { useTheme } from './hooks/useTheme';
import { useDemoMode } from './demo/useDemoMode';
import { DemoContext } from './demo/DemoContext';
import DemoBanner from './demo/DemoBanner';
import Shell from './shell/Shell';

/* ── Lazy views ─────────────────────────────────────────── */
const LandingPage = React.lazy(() => import('./landing/LandingPage'));

/* ── Loading fallback ────────────────────────────────────── */
function ViewLoadingSkeleton() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', height:'100vh', gap:'20px', background:'var(--bg-base)' }}>
      <div style={{ width:'48px', height:'48px', borderRadius:'8px',
        background:'linear-gradient(90deg,var(--bg-subtle) 25%,var(--bg-elevated) 50%,var(--bg-subtle) 75%)',
        backgroundSize:'200% 100%', animation:'sk-shimmer 1.6s ease-in-out infinite' }} />
      <div style={{ display:'flex', flexDirection:'column', gap:'8px', width:'320px' }}>
        {['100%','85%','60%'].map((w,i) => (
          <div key={i} style={{ height:'14px', borderRadius:'4px', width:w,
            background:'linear-gradient(90deg,var(--bg-subtle) 25%,var(--bg-elevated) 50%,var(--bg-subtle) 75%)',
            backgroundSize:'200% 100%', animation:'sk-shimmer 1.6s ease-in-out infinite' }} />
        ))}
      </div>
      <style>{`@keyframes sk-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </div>
  );
}

const PerfMonitor = React.lazy(() => import('./dev/PerfMonitor'));

export default function App() {
  const { theme }   = useTheme();
  const demoState   = useDemoMode();

  return (
    <LazyMotion features={domAnimation} strict={false}>
      <DemoContext.Provider value={demoState}>
        <div data-theme={theme}>
          <GrainFilter />
          <PaperGrain />
          {/* DemoBanner sits above everything — fixed, z-index 9999 */}
          <DemoBanner />
          <Router>
            <Suspense fallback={<ViewLoadingSkeleton />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/dashboard" element={<Navigate to="/dashboard/alerts" replace />} />
                <Route path="/dashboard/*" element={<Shell />} />
              </Routes>
            </Suspense>
          </Router>
          {import.meta.env.DEV && (
            <Suspense fallback={null}><PerfMonitor /></Suspense>
          )}
        </div>
      </DemoContext.Provider>
    </LazyMotion>
  );
}
