/* SHEET 07 · THE COUNTERFEITER'S DIE (Part 10, locked PLATE). The recruiter
   is the master die; mules are generation-degraded copies — degradation IS
   graph distance made visible. Angular position = recruitment sequence,
   radius = graph distance. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiProblem, WatchInterrupted, type Recruiter, type RecruiterCampaign } from "../api/client";
import { useLockMode } from "../shell/ModeContext";
import { Seal } from "../canon/Seal";
import { useNotices } from "../canon/Notices";
import { deriveHarmonics, paramsFromScore, hashSeed } from "../engine/rosette";
import { moneyShort } from "../lib/format";
import "./recruiter.css";

const CANVAS_W = 820, CANVAS_H = 620;

export function RecruiterDie() {
  useLockMode("plate");
  const [recruiters, setRecruiters] = useState<Recruiter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<Recruiter | null>(null);
  const [campaign, setCampaign] = useState<RecruiterCampaign | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cancelStart = useRef<number | null>(null);
  const cancelRaf = useRef<number>(0);
  const [cancelled, setCancelled] = useState(false);
  const { post } = useNotices();

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ data: Recruiter[] }>("/api/v1/recruiters");
      setRecruiters(res.data);
      if (res.data[0]) setSel((s) => s ?? res.data[0]);
    } catch (err) {
      setRecruiters(null);
      setError(err instanceof WatchInterrupted ? err.message
        : err instanceof ApiProblem ? `${err.title}${err.detail ? ` — ${err.detail}` : ""}`
        : "The die could not be read.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!sel) return;
    setCampaign(null);
    (async () => {
      try {
        const res = await api<{ data: RecruiterCampaign }>(`/api/v1/recruiters/${sel.id}/campaign`);
        setCampaign(res.data);
      } catch { setCampaign(null); }
    })();
  }, [sel]);

  const mules = useMemo(() => campaign?.nodes.filter((n) => n.id !== sel?.id) ?? [], [campaign, sel]);

  /* Draw the die at a given cancellation progress (0 = intact, ≥1 = fully
     struck). The M10 wave cancels copies outward in generation order. */
  const draw = useCallback((cancelT: number) => {
    const cv = canvasRef.current; if (!cv || !sel) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = CANVAS_W * dpr; cv.height = CANVAS_H * dpr;
    const ctx = cv.getContext("2d")!; ctx.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--ink").trim() || "#EFE9DA";
    const vermilion = css.getPropertyValue("--vermilion").trim() || "#FF5A38";
    const faint = css.getPropertyValue("--ink-faint").trim() || "rgba(239,233,218,0.38)";
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const cx = CANVAS_W / 2, cy = CANVAS_H / 2;

    const drawRosette = (x: number, y: number, r: number, warmth: number, seed: string, noise: number, color: string, weight: number, alphaMul = 1) => {
      const params = paramsFromScore(warmth, [], seed);
      const { harmonics, alpha, phiAlpha } = deriveHarmonics(params);
      const ampSum = harmonics.reduce((a, h) => a + h.A, 0);
      const scale = r / (ampSum * (1 + alpha));
      let rnd = hashSeed(seed);
      const rand = () => { rnd = (rnd * 1664525 + 1013904223) >>> 0; return rnd / 4294967296; };
      ctx.globalAlpha = alphaMul; ctx.strokeStyle = color; ctx.lineWidth = weight;
      ctx.beginPath();
      for (let i = 0; i <= 180; i++) {
        const th = (i / 180) * Math.PI * 2;
        let px = 0, py = 0;
        for (const h of harmonics) { px += h.A * Math.cos(h.R * th + h.phi); py += h.A * Math.sin(h.R * th + h.phi); }
        const mod = 1 + alpha * Math.sin(th + phiAlpha);
        px = x + px * mod * scale + (rand() - 0.5) * noise;
        py = y + py * mod * scale + (rand() - 0.5) * noise;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 1;
    };

    const positions = mules.map((m, i) => {
      const ang = (i / Math.max(1, mules.length)) * Math.PI * 2;
      const gen = 1 + (i % 3);
      const rr = 120 + gen * 60;
      return { m, x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr, gen, order: i };
    });

    // edges to mules
    ctx.strokeStyle = faint; ctx.lineWidth = 0.6;
    for (const p of positions) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y); ctx.stroke(); }

    // mules — degraded copies; the wave strikes each in strike order
    for (const p of positions) {
      // per-copy local progress: staggered by strike order (40ms → normalized)
      const local = cancelT <= 0 ? 0 : Math.max(0, Math.min(1, (cancelT - p.order * 0.03) / 0.35));
      const fade = 1 - local * 0.7; // fades to 30%
      drawRosette(p.x, p.y, 22, p.m.warmth_score, p.m.account_ref, p.gen * 1.6, p.m.tainted ? vermilion : ink, 0.6, fade);
      if (local > 0) {
        // cancel-cross draws over the struck copy
        ctx.globalAlpha = Math.min(1, local * 1.5); ctx.strokeStyle = vermilion; ctx.lineWidth = 1.2;
        const s = 14 * Math.min(1, local * 1.5);
        ctx.beginPath(); ctx.moveTo(p.x - s, p.y - s); ctx.lineTo(p.x + s, p.y + s);
        ctx.moveTo(p.x + s, p.y - s); ctx.lineTo(p.x - s, p.y + s); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }

    // the master die — crisp, framed; the punch strikes it last
    const masterStruck = Math.max(0, Math.min(1, cancelT - 0.2));
    ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.globalAlpha = 1 - masterStruck * 0.5;
    ctx.strokeRect(cx - 44, cy - 44, 88, 88);
    drawRosette(cx, cy, 36, sel.warmth_score ?? 80, sel.account_ref, 0, ink, 1.4, 1 - masterStruck * 0.5);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ink; ctx.font = "11px 'IBM Plex Mono', monospace"; ctx.textAlign = "center";
    ctx.fillText(sel.account_ref, cx, cy + 60);
    if (masterStruck > 0.4) {
      ctx.strokeStyle = vermilion; ctx.lineWidth = 2;
      ctx.strokeRect(cx - 44, cy - 44, 88, 88);
      ctx.beginPath(); ctx.moveTo(cx - 44, cy - 44); ctx.lineTo(cx + 44, cy + 44);
      ctx.moveTo(cx + 44, cy - 44); ctx.lineTo(cx - 44, cy + 44); ctx.stroke();
    }
  }, [sel, mules]);

  useEffect(() => {
    if (cancelStart.current === null) draw(cancelled ? 1.6 : 0);
  }, [draw, cancelled]);

  /* The cancellation wave (M10) — never exceeds 1.6s regardless of n. */
  const runCancelWave = useCallback(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setCancelled(true); return; }
    cancelStart.current = performance.now();
    const step = (now: number) => {
      const t = (now - (cancelStart.current ?? now)) / 1600; // 1.6s max
      draw(Math.min(1.6, t * 1.6));
      if (t < 1) cancelRaf.current = requestAnimationFrame(step);
      else { cancelStart.current = null; setCancelled(true); }
    };
    cancelRaf.current = requestAnimationFrame(step);
  }, [draw]);

  useEffect(() => { setCancelled(false); }, [sel]);
  useEffect(() => () => cancelAnimationFrame(cancelRaf.current), []);

  return (
    <div className="die-sheet">
      <div className="die-margin">
        <h1 className="margin__title">The Counterfeiter's Die</h1>
        {error ? (
          <p className="void__detail">{error}</p>
        ) : recruiters === null ? (
          <span className="unprinted" style={{ width: "80%" }} />
        ) : recruiters.length === 0 ? (
          <p className="void__detail">No active dies detected.</p>
        ) : (
          <ul className="die-list">
            {recruiters.map((r) => (
              <li key={r.id}>
                <button className={`die-list__item${sel?.id === r.id ? " die-list__item--active" : ""}`} onClick={() => setSel(r)}>
                  <span className="mx die-list__ref">{r.account_ref}</span>
                  <span className="v-label die-list__class">{r.scale_class.replace(/_/g, " ")}</span>
                  <span className="mx die-list__meta">EDITION OF {r.downstream_count}{r.total_distributed ? ` · ${moneyShort(r.total_distributed)}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {sel && (
          <div style={{ marginTop: "var(--s-6)" }}>
            <Seal label="Freeze campaign" variant="vermilion" disabled={cancelled} disabledReason="The die is cancelled"
              onAuthorize={async () => {
                try {
                  await api(`/api/v1/recruiters/${sel.id}/freeze-campaign`, { method: "POST" });
                  runCancelWave(); // the product's most theatrical 900ms — every frame a real state change
                  post({ msg: `DIE CANCELLED — campaign of ${mules.length} copies struck. Audit ref printed.`, tone: "success" });
                } catch (err) { post({ msg: err instanceof ApiProblem ? err.title : "The freeze was returned.", tone: "error" }); }
              }} />
          </div>
        )}
      </div>

      <div className="die-canvas-wrap">
        {sel ? (
          <>
            <div className="die-edition mx">
              EDITION OF {sel.downstream_count} · {sel.scale_class.replace(/_/g, " ")}
              {sel.warmth_score != null && <> · WARMTH {Math.round(sel.warmth_score)}</>}
            </div>
            <canvas ref={canvasRef} className="die-canvas" style={{ width: CANVAS_W, height: CANVAS_H, maxWidth: "100%" }}
              aria-label={`Campaign of ${sel.account_ref}: ${mules.length} mules in strike order`} />
            <ul className="sr-only">{mules.slice(0, 50).map((m) => <li key={m.id}>{m.account_ref}, warmth {Math.round(m.warmth_score)}</li>)}</ul>
          </>
        ) : (
          <div className="void"><p className="void__line">Select a die to read its campaign.</p></div>
        )}
      </div>
    </div>
  );
}
