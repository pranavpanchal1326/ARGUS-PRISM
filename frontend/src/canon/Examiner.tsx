/* SHEET 12 · THE EXAMINER (Part 9.22 / 10) — the assistant. A loupe button
   opens a drawer: transcript on paper, examiner lines typeset-in from the
   SSE stream (never slower than the stream — the pacing IS the stream).
   Offline: the loupe lies at 45°, input disabled, the rest untouched. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "./Icon";
import { tokens } from "../api/client";

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

interface Turn { role: "operator" | "examiner"; text: string; }

export function Examiner() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const { pathname } = useLocation();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const screen = pathname.replace(/^\//, "").split("/")[0] || "alerts";

  /* Context-bound suggestion slips, re-printed on sheet change. */
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/v1/assistant/suggestions?screen=${screen}`, {
          headers: { Authorization: `Bearer ${tokens.access}` },
        });
        const body = await res.json();
        setChips(body.data ?? []);
      } catch { setChips([]); }
    })();
  }, [open, screen]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [turns]);

  const ask = useCallback(async (message: string) => {
    if (!message.trim() || busy) return;
    setBusy(true); setOffline(false);
    setTurns((t) => [...t, { role: "operator", text: message }, { role: "examiner", text: "" }]);
    setInput("");
    try {
      const res = await fetch(`${BASE}/api/v1/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.access}` },
        body: JSON.stringify({ message, screen_context: { screen } }),
      });
      if (!res.ok || !res.body) throw new Error("unavailable");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const ev = JSON.parse(payload);
            if (ev.event === "unavailable" || ev.type === "unavailable") { setOffline(true); continue; }
            const tok = ev.token ?? ev.delta ?? ev.text ?? "";
            acc += tok;
          } catch { acc += payload; }
          setTurns((t) => { const n = [...t]; n[n.length - 1] = { role: "examiner", text: acc }; return n; });
        }
      }
      if (!acc) setOffline(true);
    } catch {
      setOffline(true);
      setTurns((t) => t.slice(0, -1));
    } finally { setBusy(false); }
  }, [busy, screen]);

  return (
    <>
      <button className={`loupe-btn${offline ? " loupe-btn--off" : ""}`} onClick={() => setOpen((o) => !o)}
        aria-label={offline ? "The examiner has stepped away" : "Open the examiner"}>
        <Icon name="examine" size={28} decorative />
      </button>

      {open && (
        <div className="examiner">
          <header className="examiner__head">
            <span className="v-label">The Examiner</span>
            <button className="drawer__close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </header>

          <div className="examiner__transcript" ref={scrollRef}>
            {turns.length === 0 && !offline && (
              <p className="examiner__greeting">I answer from the press's own records. I hold no opinions.</p>
            )}
            {turns.map((t, i) => (
              <div key={i} className={`turn turn--${t.role}`}>
                <p className="turn__text">{t.text || (t.role === "examiner" && busy ? "…" : "")}</p>
              </div>
            ))}
            {offline && <p className="examiner__offline">The examiner has stepped away.</p>}
          </div>

          {chips.length > 0 && !offline && (
            <div className="examiner__chips">
              {chips.slice(0, 3).map((c) => (
                <button key={c} className="req-slip" onClick={() => ask(c)}>{c}</button>
              ))}
            </div>
          )}

          <form className="examiner__composer" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <input className="field__input" value={input} disabled={offline || busy}
              placeholder={offline ? "The examiner has stepped away" : "Ask the examiner…"}
              onChange={(e) => setInput(e.target.value)} />
          </form>
        </div>
      )}
    </>
  );
}
