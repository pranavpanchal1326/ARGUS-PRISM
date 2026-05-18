import React from 'react';
import Nav               from './sections/Nav';
import Hero              from './sections/Hero';
import CrisisTicker      from './sections/CrisisTicker';
import ProblemGap        from './sections/ProblemGap';
import HowItWorks        from './sections/HowItWorks';
import FiveEngines       from './sections/FiveEngines';
import LegalArchitecture from './sections/LegalArchitecture';
import DemoCTA           from './sections/DemoCTA';
import Footer            from './sections/Footer';

/**
 * LandingPage — complete PRISM landing page assembly.
 *
 * Section order (all 9):
 *   Nav → Hero → CrisisTicker → ProblemGap → HowItWorks
 *   → FiveEngines → LegalArchitecture → DemoCTA → Footer
 *
 * Phase 4A (NavBar + Sidebar) opens a new context — dashboard shell.
 * No landing page code bleeds into Phase 4+.
 */
function LandingPage() {
  return (
    <div
      style={{
        background: 'var(--bg-base)',
        minHeight:  '100vh',
        filter:     'url(#paper-grain)',
      }}
    >
      <Nav />

      <main>
        <Hero />
        <CrisisTicker />
        <ProblemGap />
        <HowItWorks />
        <FiveEngines />
        <LegalArchitecture />
        <DemoCTA />
      </main>

      <Footer />
    </div>
  );
}

export default LandingPage;
