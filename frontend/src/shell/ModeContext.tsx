/* The NOTE / PLATE lever (Part 2.3.3) + the Large Print Edition
   (Part 13.2 §6). Per-operator persisted; some sheets lock a mode. */
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Mode = "note" | "plate";
interface ModeCtx {
  mode: Mode; setMode: (m: Mode) => void; toggle: () => void;
  largePrint: boolean; setLargePrint: (v: boolean) => void;
}

const Ctx = createContext<ModeCtx>({
  mode: "note", setMode: () => {}, toggle: () => {},
  largePrint: false, setLargePrint: () => {},
});

function seed(): Mode {
  const saved = localStorage.getItem("prism.mode");
  if (saved === "note" || saved === "plate") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "plate" : "note";
}

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(seed);
  const [largePrint, setLargePrintState] = useState(() => localStorage.getItem("prism.largeprint") === "1");

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    localStorage.setItem("prism.mode", mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-large-print", largePrint);
    localStorage.setItem("prism.largeprint", largePrint ? "1" : "0");
  }, [largePrint]);

  const setMode = useCallback((m: Mode) => setModeState(m), []);
  const toggle = useCallback(() => setModeState((m) => (m === "note" ? "plate" : "note")), []);
  const setLargePrint = useCallback((v: boolean) => setLargePrintState(v), []);

  return (
    <Ctx.Provider value={{ mode, setMode, toggle, largePrint, setLargePrint }}>
      {children}
    </Ctx.Provider>
  );
}

export const useMode = () => useContext(Ctx);

/** Sheets call this to force a mode while mounted (locked-mode sheets). */
export function useLockMode(locked?: Mode) {
  const { setMode } = useMode();
  useEffect(() => {
    if (!locked) return;
    const prev = document.documentElement.getAttribute("data-mode");
    document.documentElement.setAttribute("data-mode", locked);
    return () => { if (prev) document.documentElement.setAttribute("data-mode", prev); };
  }, [locked, setMode]);
}
