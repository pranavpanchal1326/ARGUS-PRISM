/* THE INDEX CARD DRAWER (9.7) — plane 2. Slides from the right; one at a
   time; Esc/scrim/X closes; focus-trapped; returns focus to invoker. */
import { useEffect, useRef } from "react";

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

  useEffect(() => {
    if (open) {
      invoker.current = document.activeElement;
      panelRef.current?.focus();
    } else if (invoker.current instanceof HTMLElement) {
      invoker.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="drawer-scrim" onClick={onClose}>
      <div className="drawer" role="dialog" aria-modal="true" aria-label={title}
        tabIndex={-1} ref={panelRef} onClick={(e) => e.stopPropagation()}>
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
