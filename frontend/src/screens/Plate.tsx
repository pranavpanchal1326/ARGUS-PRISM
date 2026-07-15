/* SHEET 06 · THE ENGRAVER'S PLATE (Part 10, locked PLATE). Hand-rolled 2D
   canvas renderer — no graph library (the aesthetic and the determinism
   forbid one). Nodes = rosettes, edges = engraved strokes. The art and the
   engineering are the same thing here. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiProblem, WatchInterrupted, type Graph, type GraphNode, type AccountSummary } from "../api/client";
import { useLockMode } from "../shell/ModeContext";
import { Drawer } from "../canon/Drawer";
import { Rosette } from "../canon/Rosette";
import { Overprint } from "../canon/Overprint";
import { Seal } from "../canon/Seal";
import { useNotices } from "../canon/Notices";
import { layoutGraph, type Positioned } from "../engine/layout";
import { deriveHarmonics, rosettePath, paramsFromScore, hashSeed } from "../engine/rosette";
import "./plate.css";

const CANVAS_W = 900, CANVAS_H = 620;

export function Plate() {
  useLockMode("plate");
  const [focus, setFocus] = useState(() => new URLSearchParams(location.search).get("focus") ?? "");
  const [hops, setHops] = useState(2);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [frozen, setFrozen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const posRef = useRef<Positioned[]>([]);
  const { post } = useNotices();

  /* No deep-link focus? Resolve a real starting account (Law 2 — never a
     hardcoded serial that may not exist). Prefer the warmest account. */
  useEffect(() => {
    if (focus) return;
    (async () => {
      try {
        const res = await api<{ data: AccountSummary[] }>("/api/v1/accounts?limit=1");
        if (res.data[0]) setFocus(res.data[0].id);
      } catch { /* leave empty; the sheet prints its blank state */ }
    })();
  }, [focus]);

  const load = useCallback(async () => {
    if (!focus) return;
    setError(null); setGraph(null);
    try {
      const res = await api<{ data: Graph }>(`/api/v1/graph/neighborhood/${focus}?hops=${hops}`);
      setGraph(res.data);
    } catch (err) {
      setError(err instanceof WatchInterrupted ? err.message
        : err instanceof ApiProblem ? `${err.title}${err.detail ? ` — ${err.detail}` : ""}`
        : "The plate could not be etched.");
    }
  }, [focus, hops]);
  useEffect(() => { void load(); }, [load]);

  const positioned = useMemo(() => {
    if (!graph) return [];
    const p = layoutGraph(graph.nodes, graph.edges, graph.root, CANVAS_W, CANVAS_H);
    posRef.current = p;
    return p;
  }, [graph]);

  /* Draw the plate. Full redraw on layout/selection change only. */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !graph) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = CANVAS_W * dpr; cv.height = CANVAS_H * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--ink").trim() || "#EFE9DA";
    const reserve = css.getPropertyValue("--reserve").trim() || "#5C77E6";
    const vermilion = css.getPropertyValue("--vermilion").trim() || "#FF5A38";
    const faint = css.getPropertyValue("--ink-faint").trim() || "rgba(239,233,218,0.38)";

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const byId = new Map(positioned.map((p) => [p.node.id, p]));

    // edges — engraved strokes; width maps value, taper marks direction
    let maxVal = 1;
    for (const e of graph.edges) maxVal = Math.max(maxVal, e.value);
    ctx.lineCap = "round";
    for (const e of graph.edges) {
      const s = byId.get(e.source), t = byId.get(e.target);
      if (!s || !t) continue;
      ctx.strokeStyle = faint;
      ctx.lineWidth = 1 + (e.value / maxVal) * 3;
      ctx.globalAlpha = 0.5 + (e.value / maxVal) * 0.5;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // nodes — rosettes; radius maps balance-ish (score), distortion maps warmth
    for (const p of positioned) {
      const nd = p.node;
      const r = 8 + Math.min(20, (nd.warmth_score / 100) * 20);
      const params = paramsFromScore(nd.warmth_score, [], nd.account_ref);
      const { harmonics, alpha, phiAlpha } = deriveHarmonics(params);
      const hs = harmonics;
      const ampSum = hs.reduce((a, hh) => a + hh.A, 0);
      const scale = r / (ampSum * (1 + alpha));
      const seedRand = hashSeed(nd.account_ref);

      ctx.strokeStyle = nd.tainted || nd.severity === "CRITICAL" || nd.severity === "IMMINENT"
        ? vermilion : nd.severity === "HOT" ? reserve : ink;
      ctx.lineWidth = nd.id === graph.root ? 1.3 : 0.7;
      ctx.globalAlpha = frozen ? 0.3 : 1; // struck nodes fade to 30% (M10)
      ctx.beginPath();
      for (let i = 0; i <= 180; i++) {
        const th = (i / 180) * Math.PI * 2;
        let x = 0, y = 0;
        for (const hh of hs) { x += hh.A * Math.cos(hh.R * th + hh.phi); y += hh.A * Math.sin(hh.R * th + hh.phi); }
        const mod = 1 + alpha * Math.sin(th + phiAlpha);
        x = p.x + x * mod * scale; y = p.y + y * mod * scale;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();

      if (frozen) { // cancel-cross over each struck node
        ctx.globalAlpha = 1; ctx.strokeStyle = vermilion; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x - r, p.y - r); ctx.lineTo(p.x + r, p.y + r);
        ctx.moveTo(p.x + r, p.y - r); ctx.lineTo(p.x - r, p.y + r); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // focused node carries a serial tag plate
      if (nd.id === graph.root || nd === selected) {
        ctx.fillStyle = ink; ctx.font = "10px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(nd.account_ref, p.x, p.y + r + 12);
      }
      void seedRand;
    }
  }, [positioned, graph, selected, frozen]);

  useEffect(() => { setFrozen(false); }, [graph]); // fresh plate, fresh state

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_H / rect.height);
    let hit: GraphNode | null = null, best = 24;
    for (const p of posRef.current) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < best) { best = d; hit = p.node; }
    }
    setSelected(hit);
  };

  return (
    <div className="plate-sheet">
      <div className="plate-margin">
        <h1 className="margin__title">The Engraver's Plate</h1>
        <div className="field">
          <span className="field__label">Focus serial</span>
          <input className="field__input" value={focus} onChange={(e) => setFocus(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void load(); }} />
        </div>
        <div className="plate-depth">
          <span className="field__label">Depth</span>
          <div className="plate-depth__stops">
            {[1, 2, 3, 4].map((h) => (
              <button key={h} className={`punch${hops === h ? " punch--active" : ""}`} onClick={() => setHops(h)}>{h}</button>
            ))}
          </div>
        </div>
        <div className="plate-legend card">
          <p className="v-label">Reading the plate</p>
          <ul className="plate-legend__list">
            <li>Rosette size · balance</li>
            <li>Distortion · warmth</li>
            <li>Vermilion · tainted / critical</li>
            <li>Stroke weight · edge value</li>
          </ul>
        </div>
        {graph && (
          <Seal label="Freeze cluster" variant="vermilion" disabled={frozen} disabledReason="The cluster is cancelled"
            onAuthorize={async () => {
              try {
                await api("/api/v1/graph/freeze-cluster", { method: "POST", body: JSON.stringify({ root: graph.root, hops }) });
                setFrozen(true); // struck nodes fade to 30% + cancel-cross (M10)
                post({ msg: `Cluster of ${graph.nodes.length} accounts cancelled. Audit ref printed.`, tone: "success" });
              } catch (err) {
                post({ msg: err instanceof ApiProblem ? err.title : "The freeze was returned.", tone: "error" });
              }
            }} />
        )}
      </div>

      <div className="plate-canvas-wrap">
        {error ? (
          <div className="misprint"><div className="misprint__stamp"><Overprint tone="vermilion">MISPRINT</Overprint></div><p className="misprint__detail">{error}</p><button className="btn btn--secondary" onClick={() => void load()}>Re-etch the plate</button></div>
        ) : !graph ? (
          <div className="void"><p className="void__line">The plate is etching…</p></div>
        ) : graph.nodes.length === 0 ? (
          <div className="void"><p className="void__line">The plate is blank.</p><p className="void__detail">No linked flow within {hops} hops.</p></div>
        ) : (
          <canvas ref={canvasRef} className="plate-canvas"
            style={{ width: CANVAS_W, height: CANVAS_H, maxWidth: "100%" }}
            onClick={onCanvasClick} aria-label={`Neighborhood of ${focus}: ${graph.nodes.length} accounts`} />
        )}
        {/* Parallel DOM for assistive tech — the Plate is never a black box */}
        <ul className="sr-only">
          {graph?.nodes.slice(0, 50).map((n) => <li key={n.id}>{n.account_ref}, warmth {Math.round(n.warmth_score)}, {n.severity}</li>)}
        </ul>
      </div>

      <Drawer open={!!selected} title={selected?.account_ref ?? ""} refLabel="ACCOUNT" onClose={() => setSelected(null)}>
        {selected && (
          <div className="plate-drawer">
            <Rosette params={paramsFromScore(selected.warmth_score, [], selected.account_ref)} size={96} tier={3} />
            <p className="mx" style={{ fontSize: "var(--text-28)", fontWeight: 600, textAlign: "center" }}>{Math.round(selected.warmth_score)}</p>
            <p className="void__detail" style={{ textAlign: "center" }}>{selected.severity}{selected.tainted ? " · tainted" : ""}{selected.is_recruiter ? " · recruiter" : ""}</p>
            <button className="btn btn--secondary" onClick={() => { setFocus(selected.account_ref); setSelected(null); }}>Re-focus the plate here</button>
          </div>
        )}
      </Drawer>
    </div>
  );
}

void rosettePath; // engine surface kept in scope for future SVG parity
