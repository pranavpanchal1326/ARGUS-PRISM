/* THE PRESS-NOTICE (9.8) — bottom-left dock. Deckle-edged slips; info/
   success/error tones; max 2 visible; errors persist. Never covers the
   folio, dossier actions, or any Seal (they live elsewhere). */
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Overprint } from "./Overprint";

export interface Notice {
  id: number;
  msg: string;
  tone: "info" | "success" | "error";
  action?: { label: string; onClick: () => void };
}

interface Ctx { post: (n: Omit<Notice, "id">) => void; }
const NoticeCtx = createContext<Ctx>({ post: () => {} });

export function NoticeProvider({ children }: { children: React.ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [leaving, setLeaving] = useState<Set<number>>(new Set());
  const seq = useRef(1);

  const dismiss = useCallback((id: number) => {
    // play the exit, then remove
    setLeaving((s) => new Set(s).add(id));
    setTimeout(() => {
      setNotices((n) => n.filter((x) => x.id !== id));
      setLeaving((s) => { const c = new Set(s); c.delete(id); return c; });
    }, 240);
  }, []);

  const post = useCallback((n: Omit<Notice, "id">) => {
    const id = seq.current++;
    setNotices((prev) => [...prev, { ...n, id }].slice(-4));
    if (n.tone !== "error") setTimeout(() => dismiss(id), 6000);
  }, [dismiss]);

  const dateline = () =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).format(new Date()) + " IST";

  const visible = notices.slice(-2);

  return (
    <NoticeCtx.Provider value={{ post }}>
      {children}
      <div className="notice-dock" aria-live="polite">
        {visible.map((n) => (
          <div key={n.id} className={`notice${n.tone === "error" ? " notice--error" : ""}${leaving.has(n.id) ? " notice--leaving" : ""}`}
            role={n.tone === "error" ? "alert" : "status"}>
            <span className="notice__dateline">{dateline()}</span>
            <div className="notice__msg">
              {n.tone === "error" && <Overprint tone="vermilion" size="micro">MISPRINT</Overprint>} {n.msg}
            </div>
            {n.action && (
              <button className="btn btn--quiet" onClick={() => { n.action!.onClick(); dismiss(n.id); }}>
                {n.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </NoticeCtx.Provider>
  );
}

export const useNotices = () => useContext(NoticeCtx);
