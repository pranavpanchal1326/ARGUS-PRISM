import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

/* The three voices — Machine self-hosted (IBM Plex Mono stands for Martian
   until the Fontshare subset lands); Display/Text fall back gracefully. */
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import "./styles/fonts.css";
import "./styles/palette.css";
import "./styles/semantic.css";
import "./styles/type.css";
import "./styles/motion.css";
import "./styles/base.css";
import "./styles/print.css";
import "./canon/canon.css";

import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
