/* THE INDEX CARD DRAWER (9.7) — plane 2. Slides from the right; one at a
   time; Esc/scrim/X closes; focus-trapped; returns focus to invoker.
   Slides back out on close (M14 reversed) before unmounting. */
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  title: string;
  refLabel?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Drawer({ open, title, refLabel, onClose, children }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const invoker = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (open) {
      setMounted(true); setClosing(false);
      invoker.current = document.activeElement;
      requestAnimationFrame(() => panelRef.current?.focus());
    } else if (mounted) {
      if (reduced()) { setMounted(false); }
      else { setClosing(true); const t = setTimeout(() => setMounted(false), 240); return () => clearTimeout(t); }
      if (invoker.current instanceof HTMLElement) invoker.current.focus();
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, onClose]);

  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  if (!mounted) return null;

  return (
    <div className={`drawer-scrim${closing ? " drawer-scrim--closing" : ""}`} onClick={onClose}>
      <div className={`drawer${closing ? " drawer--closing" : ""}`} role="dialog" aria-modal="true" aria-label={title}
        tabIndex={-1} ref={panelRef} onClick={stop}>
        <header className="drawer__head">
          <div>
            {refLabel && <span className="mx drawer__ref">{refLabel}</span>}
            <h2 className="drawer__title v-display v-display--section">{title}</h2>
          </div>
          <button className="drawer__close" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="drawer__body">{children}</div>
      </div>
    </div>
  );
}
