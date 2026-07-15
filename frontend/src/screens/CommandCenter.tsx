/* SHEET 02 · THE PRESS FLOOR (Part 10, locked PLATE). Ambient awareness —
   pull, not push. Velocity + anomaly readable from three metres. The
   ticker pauses on hover (LAW V even here); the counters flip on change. */
import { useCallback, useEffect, useRef, useState } from "react";
import { api, WS_BASE, tokens, type Pulse } from "../api/client";
import { useLockMode } from "../shell/ModeContext";
import { useCountUp } from "../lib/motion";
import { moneyShort } from "../lib/format";
import { deriveHarmonics, paramsFromScore } from "../engine/rosette";
import "./command.css";

interface Stub { id: number; type: string; ref: string; amount?: number; }

const FLOW_W = 900, FLOW_H = 340, STATIONS = 14;
/* Deterministic abstract floor — station plates by index (not a map). */
const STATION_POS = Array.from({ length: STATIONS }, (_, i) => {
  const cols = 5, row = Math.floor(i / cols), col = i % cols;
  const jitterX = ((i * 2654435761) % 40) - 20;
  const jitterY = ((i * 40503) % 30) - 15;
  return {
    x: 90 + col * ((FLOW_W - 180) / (cols - 1)) + jitterX,
    y: 70 + row * 100 + jitterY,
    warmth: (i * 37) % 100,
  };
});
interface Trace { from: number; to: number; born: number; critical: boolean; }

export function CommandCenter() {
  useLockMode("plate");
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [ticker, setTicker] = useState<Stub[]>([]);
  const [connected, setConnected] = useState(false);
  const seismoRef = useRef<HTMLCanvasElement | null>(null);
  const flowRef = useRef<HTMLCanvasElement | null>(null);
  const traces = useRef<Trace[]>([]);
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
          // Each event prints a light-trace across the floor (persists 2s).
          const n = seq.current;
          const from = n % STATIONS, to = (n * 7 + 3) % STATIONS;
          traces.current.push({ from, to: to === from ? (to + 1) % STATIONS : to, born: performance.now(),
            critical: ev.type === "alert.raised" });
          if (traces.current.length > 60) traces.current.shift();
        } catch { /* non-JSON */ }
      };
      ws.onclose = () => { setConnected(false); if (!closed) { setTimeout(connect, retry); retry = Math.min(retry * 2, 15000); } };
    };
    connect();
    const sample = setInterval(() => { rates.current = [...rates.current.slice(1), windowCount]; windowCount = 0; drawSeismo(); }, 500);
    return () => { closed = true; ws?.close(); clearInterval(sample); };
  }, []);

  /* THE FLOW FIELD — engraved station plates + inter-branch light-traces
     that print, persist 2s, and fade. Canvas, 30fps cap, transform-free. */
  const drawFlow = useCallback((now: number) => {
    const cv = flowRef.current; if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== FLOW_W * dpr) { cv.width = FLOW_W * dpr; cv.height = FLOW_H * dpr; }
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--ink").trim() || "#EFE9DA";
    const reserve = css.getPropertyValue("--reserve").trim() || "#5C77E6";
    const vermilion = css.getPropertyValue("--vermilion").trim() || "#FF5A38";
    const faint = css.getPropertyValue("--ink-faint").trim() || "rgba(239,233,218,0.3)";
    ctx.clearRect(0, 0, FLOW_W, FLOW_H);

    // active light-traces (2s life); light eases linearly along the path
    traces.current = traces.current.filter((tr) => now - tr.born < 2000);
    for (const tr of traces.current) {
      const life = (now - tr.born) / 2000;
      const a = STATION_POS[tr.from], b = STATION_POS[tr.to];
      ctx.strokeStyle = tr.critical ? vermilion : reserve;
      ctx.globalAlpha = (1 - life) * 0.7;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      // the travelling light head
      const hx = a.x + (b.x - a.x) * Math.min(1, life * 2);
      const hy = a.y + (b.y - a.y) * Math.min(1, life * 2);
      ctx.globalAlpha = (1 - life);
      ctx.beginPath(); ctx.arc(hx, hy, 2, 0, Math.PI * 2); ctx.fillStyle = tr.critical ? vermilion : reserve; ctx.fill();
    }
    ctx.globalAlpha = 1;

    // station plates — small engraved rosettes
    STATION_POS.forEach((st, i) => {
      const params = paramsFromScore(st.warmth, [], `branch-${i}`);
      const { harmonics, alpha, phiAlpha } = deriveHarmonics(params);
      const r = 16;
      const ampSum = harmonics.reduce((s, h) => s + h.A, 0);
      const scale = r / (ampSum * (1 + alpha));
      ctx.strokeStyle = faint; ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let k = 0; k <= 120; k++) {
        const th = (k / 120) * Math.PI * 2;
        let x = 0, y = 0;
        for (const h of harmonics) { x += h.A * Math.cos(h.R * th + h.phi); y += h.A * Math.sin(h.R * th + h.phi); }
        const mod = 1 + alpha * Math.sin(th + phiAlpha);
        x = st.x + x * mod * scale; y = st.y + y * mod * scale;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    });
    void ink;
  }, []);

  useEffect(() => {
    drawFlow(performance.now()); // paint the static station field immediately
    // A timer drives the trace animation; it keeps ticking even when the tab
    // is backgrounded (rAF pauses there), so the floor is never blank.
    const iv = setInterval(() => drawFlow(performance.now()), 40); // ~25fps
    return () => clearInterval(iv);
  }, [drawFlow]);

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
            [...ticker, ...ticker].map((s, i) => (
              <span key={`${s.id}-${i}`} className="floor-ticker__stub">
                {s.type} · {s.ref}{s.amount ? ` · ${moneyShort(s.amount)}` : ""}
              </span>
            ))}
        </div>
      </div>

      <div className={`floor-field${connected ? "" : " floor-field--stopped"}`}>
        <canvas ref={flowRef} className="floor-canvas"
          style={{ width: FLOW_W, height: FLOW_H, maxWidth: "100%" }}
          aria-label="The press floor — abstract station field, live flow" />
        {!connected && <p className="floor-field__stopped">THE PRESS HAS STOPPED</p>}
      </div>

      <div className="floor-counters">
        <Counter label="TX / SEC" n={pulse?.tx_per_sec ?? null} seismo={seismoRef} />
        <Counter label="ACTIVE ALERTS" n={pulse?.active_alerts ?? null} critical={!!pulse && pulse.active_alerts > 0} />
        <Counter label="ACCOUNTS WATCHED" n={pulse?.accounts_watched ?? null} grouped />
        <Counter label="AVG WARMTH" n={pulse?.avg_score ?? null} />
      </div>
    </div>
  );
}

function Counter({ label, n, critical, grouped, seismo }: {
  label: string; n: number | null; critical?: boolean; grouped?: boolean; seismo?: React.RefObject<HTMLCanvasElement | null>;
}) {
  const shown = Math.round(useCountUp(n ?? 0));
  const text = n === null ? "—" : grouped ? shown.toLocaleString("en-IN") : String(shown);
  return (
    <div className={`counter${critical ? " counter--critical" : ""}`}>
      <span className="mx num counter__v">{text}</span>
      <span className="v-label">{label}</span>
      {seismo && <canvas ref={seismo} className="counter__seismo" />}
    </div>
  );
}
