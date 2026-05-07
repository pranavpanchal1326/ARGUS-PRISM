import React from 'react';
import DashboardShell from './shell/DashboardShell';
import './styles/design-system.css';

function App() {
  return (
    <div className="prism-app">
      <DashboardShell />
      
      <style jsx="true">{`
        .prism-app {
          width: 100vw;
          height: 100vh;
          background-color: var(--void);
          color: var(--instrument-white);
          overflow: hidden;
          position: relative;
        }
        
        /* Ensure zero radius globally as a backup */
        * {
          border-radius: 0 !important;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        ::-webkit-scrollbar-track {
          background: var(--void);
        }
        ::-webkit-scrollbar-thumb {
          background: var(--instrument-dark);
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--instrument-grey);
        }
      `}</style>
    </div>
  );
}

export default App;
