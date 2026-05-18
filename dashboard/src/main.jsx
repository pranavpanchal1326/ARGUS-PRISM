import './design/tokens.css';       // 1. Token foundation — all --vars (shadows updated 2C)
import './design/globals.css';      // 2. Reset + utilities + grain binding
import './design/typography.css';   // 3. Font scale (.type-* and .text-* classes)
import './design/transitions.css';  // 4. Global theme transition + keyframes
import './design/animations.css';   // 5. Component-specific keyframes (prism-* prefix)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

/*
  IMPORT ORDER RATIONALE — NON-NEGOTIABLE:
  tokens.css      → defines all --vars (must be FIRST)
  globals.css     → uses --vars for reset + card-hover + grain
  typography.css  → uses --font-* vars from tokens
  transitions.css → uses --vars for global colour transition
  animations.css  → uses --vars for health-dot and badge colours

  If any CSS file loads before tokens.css, all
  var() references in that file resolve to nothing.
*/

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
