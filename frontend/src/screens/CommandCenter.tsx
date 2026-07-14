/* SHEET 02 · THE PRESS FLOOR (Part 10, locked PLATE). Ambient awareness —
   pull, not push. Velocity + anomaly readable from three metres. The
   ticker pauses on hover (LAW V even here); the counters flip on change. */
import { useEffect, useRef, useState } from "react";
import { api, WS_BASE, tokens, type Pulse } from "../api/client";
import { useLockMode } from "../shell/ModeContext";
import { moneyShort } from "../lib/format";
import "./command.css";

interface Stub { id: number; type: string; ref: string; amount?: number; }

export function CommandCenter() {
  useLockMode("plate");
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [ticker, setTicker] = useState<Stub[]>([]);
  const [connected, setConnected] = useState(false);
  const seismoRef = useRef<HTMLCanvasElement | null>(null);
  const rates = useRef<number[]>(new Array(120).fill(0));
  const seq = useRef(1);

  useEffect(() => {
    let live = true;
    const poll = async () => {
      try { const res = await api<{ data: Pulse }>("/api/v1/metrics/pulse"); if (live) setPulse(res.data); }
      catch { /* keep last */ }
    };
    void poll();
    const t = setInterval(poll, 3000);
    return () => { live = false; clearInterval(t); };
  }, []);

  /* The floor's stream — event stubs for the ticker + the seismograph. */
  useEffect(() => {
    if (!tokens.access) return;
    let ws: WebSocket | null = null, retry = 1000, closed = false;
    let windowCount = 0;
    const connect = () => {
      ws = new WebSocket(`${WS_BASE}/api/v1/stream?token=${tokens.access}`);
      ws.onopen = () => { retry = 1000; setConnected(true); };
      ws.onmessage = (m) => {
        windowCount++;
        try {
          const ev = JSON.parse(m.data);
          const stub: Stub = {
            id: seq.current++, type: ev.type ?? "event",
            ref: ev.payload?.account_ref ?? ev.payload?.alert_id ?? "—",
            amount: ev.payload?.amount,
          };
          setTicker((t) => [stub, ...t].slice(0, 24));
        } catch { /* non-JSON */ }
      };
      ws.onclose = () => { setConnected(false); if (!closed) { setTimeout(connect, retry); retry = Math.min(retry * 2, 15000); } };
    };
    connect();
    const sample = setInterval(() => { rates.current = [...rates.current.slice(1), windowCount]; windowCount = 0; drawSeismo(); }, 500);
    return () => { closed = true; ws?.close(); clearInterval(sample); };
  }, []);

  function drawSeismo() {
    const cv = seismoRef.current; if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = 40;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext("2d")!; ctx.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = css.getPropertyValue("--reserve").trim() || "#5C77E6";
    ctx.lineWidth = 1;
    const max = Math.max(4, ...rates.current);
    ctx.beginPath();
    rates.current.forEach((r, i) => {
      const x = (i / (rates.current.length - 1)) * w;
      const y = h - (r / max) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  return (
    <div className="floor">
      <div className={`floor-ticker mx${connected ? "" : " floor-ticker--dim"}`}>
        <div className="floor-ticker__rail">
          {ticker.length === 0 ? <span className="floor-ticker__idle">the floor is quiet</span> :
            ticker.map((s) => (
              <span key={s.id} className="floor-ticker__stub">
                {s.type} · {s.ref}{s.amount ? ` · ${moneyShort(s.amount)}` : ""}
              </span>
            ))}
        </div>
      </div>

      <div className="floor-field">
        {!connected && <p className="floor-field__stopped">THE PRESS HAS STOPPED</p>}
      </div>

      <div className="floor-counters">
        <Counter label="TX / SEC" value={pulse ? pulse.tx_per_sec.toFixed(0) : "—"} seismo={seismoRef} />
        <Counter label="ACTIVE ALERTS" value={pulse ? String(pulse.active_alerts) : "—"} critical={!!pulse && pulse.active_alerts > 0} />
        <Counter label="ACCOUNTS WATCHED" value={pulse ? pulse.accounts_watched.toLocaleString("en-IN") : "—"} />
        <Counter label="AVG WARMTH" value={pulse ? pulse.avg_score.toFixed(0) : "—"} />
      </div>
    </div>
  );
}

function Counter({ label, value, critical, seismo }: {
  label: string; value: string; critical?: boolean; seismo?: React.RefObject<HTMLCanvasElement | null>;
}) {
  return (
    <div className={`counter${critical ? " counter--critical" : ""}`}>
      <span className="mx num counter__v">{value}</span>
      <span className="v-label">{label}</span>
      {seismo && <canvas ref={seismo} className="counter__seismo" />}
    </div>
  );
}
