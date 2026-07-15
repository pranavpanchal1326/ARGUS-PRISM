/* THE LIVE NOTE — the landing's interactive centrepiece. A guilloché
   rosette the visitor WARMS with their cursor: serene six-fold symmetry
   deforms into a mule's distorted signature as they move over it. The
   visitor performs the product's core act — reading warmth — before they
   have signed in. Canvas; deterministic engine; rAF. */
import { useEffect, useRef, useState } from "react";
import { deriveHarmonics } from "../engine/rosette";

const SIZE = 460;

export function LiveNote() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const warmth = useRef(0);          // current, eased
  const target = useRef(0);          // pointer-driven target
  const shownWarmthRef = useRef(0);
  const [shownWarmth, setShownWarmth] = useState(0);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = SIZE * dpr; cv.height = SIZE * dpr;
    const ctx = cv.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(64, now - last); last = now;
      // ease current warmth toward target; decay target slowly
      warmth.current += (target.current - warmth.current) * Math.min(1, dt / 220);
      target.current *= 0.985; // cools when the cursor rests
      const w = warmth.current;
      if (Math.abs(w - shownWarmthRef.current) > 0.4) {
        shownWarmthRef.current = w; setShownWarmth(Math.round(w));
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE);
      const cx = SIZE / 2, cy = SIZE / 2;
      const css = getComputedStyle(document.documentElement);
      const ink = css.getPropertyValue("--ink").trim() || "#1A1B18";
      const vermilion = css.getPropertyValue("--vermilion").trim() || "#E33F1E";
      const intaglio = css.getPropertyValue("--intaglio").trim() || "#2E5D4B";

      // three nested harmonics, phase drifting with time for a living line
      const drift = reduced ? 0 : now * 0.00004;
      const layers = [
        { r: 200, wt: 1.0, col: ink, s: [0.5, 0.5, 0.5, 0.5, 0.5 + Math.sin(drift) * 0.2, 0.5] },
        { r: 150, wt: 0.7, col: intaglio, s: [0.4, 0.6, 0.5, 0.4, 0.5, 0.6] },
        { r: 96, wt: 0.6, col: w > 55 ? vermilion : ink, s: [0.6, 0.4, 0.6, 0.5, 0.4, 0.5] },
      ];
      for (const L of layers) {
        const params = { signals: L.s as [number, number, number, number, number, number], warmth: w / 100, seed: 7 };
        const { harmonics, alpha, phiAlpha, jitter } = deriveHarmonics(params);
        const ampSum = harmonics.reduce((a, h) => a + h.A, 0);
        const scale = L.r / (ampSum * (1 + alpha));
        ctx.strokeStyle = L.col; ctx.lineWidth = L.wt;
        ctx.globalAlpha = L.col === intaglio ? 0.55 : 1;
        ctx.beginPath();
        const N = 480;
        for (let i = 0; i <= N; i++) {
          const th = (i / N) * Math.PI * 2 + drift;
          let x = 0, y = 0;
          for (const h of harmonics) { x += h.A * Math.cos(h.R * th + h.phi); y += h.A * Math.sin(h.R * th + h.phi); }
          const mod = 1 + alpha * Math.sin(th + phiAlpha);
          const jx = jitter ? (Math.sin(i * 12.9898 + w) * 43758.5) % 1 * jitter : 0;
          x = cx + x * mod * scale + jx; y = cy + y * mod * scale + jx;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    frame(performance.now()); // paint immediately
    // A timer drives the animation; unlike rAF it keeps ticking when the
    // tab is backgrounded, so the note is never a blank square.
    const iv = setInterval(() => frame(performance.now()), 30); // ~33fps
    return () => clearInterval(iv);
  }, []);

  const onMove = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const dist = Math.min(1, Math.hypot(dx, dy));
    // closer to centre + movement = warmer; caps at 100
    target.current = Math.min(100, target.current + (1 - dist) * 14 + 4);
  };

  const band = shownWarmth < 20 ? "CLEAN" : shownWarmth < 45 ? "WARMING" : shownWarmth < 65 ? "HOT" : shownWarmth < 85 ? "CRITICAL" : "IMMINENT";

  return (
    <div className="livenote" onPointerMove={onMove} onPointerLeave={() => { target.current = 0; }}>
      <canvas ref={canvasRef} className="livenote__canvas" style={{ width: SIZE, height: SIZE, maxWidth: "100%" }}
        aria-label="An interactive guilloché — move your cursor to warm the account" />
      <div className="livenote__readout">
        <span className={`livenote__band livenote__band--${band.toLowerCase()}`}>{band}</span>
        <span className="livenote__score mx num">{shownWarmth}</span>
        <span className="livenote__hint">move to warm the account</span>
      </div>
    </div>
  );
}
