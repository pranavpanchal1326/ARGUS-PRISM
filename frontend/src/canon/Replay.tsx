/* THE REPLAY (9.13) — the time scrubber. A timeline rule with event-density
   hatching above it, a plate-registration scrub thumb, datelines at the
   ends, keyboard Left/Right (event-step). Dragging time-travels the bound
   visualization: the header rosette tweens to historical parameters —
   watch the account learn to lie. A LIVE chip returns to now. */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ScorePoint } from "../api/client";
import { Icon } from "./Icon";
import { date } from "../lib/format";

interface Props {
  points: ScorePoint[];
  /** index into points, or null for LIVE (latest). */
  onScrub: (index: number | null) => void;
}

export function Replay({ points, onScrub }: Props) {
  const [idx, setIdx] = useState<number | null>(null); // null = LIVE
  const barRef = useRef<HTMLDivElement | null>(null);
  const n = points.length;

  const commit = useCallback((next: number | null) => { setIdx(next); onScrub(next); }, [onScrub]);

  const posFromClientX = useCallback((clientX: number) => {
    const el = barRef.current; if (!el || n === 0) return 0;
    const r = el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return Math.round(t * (n - 1));
  }, [n]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    commit(posFromClientX(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    commit(posFromClientX(e.clientX));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); commit(Math.max(0, (idx ?? n - 1) - 1)); }
      else if (e.key === "ArrowRight") {
        const next = (idx ?? n - 1) + 1;
        if (next >= n - 1) commit(null); else commit(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, n, commit]);

  if (n === 0) return null;
  const live = idx === null;
  const activeIdx = idx ?? n - 1;
  const thumbPct = (activeIdx / Math.max(1, n - 1)) * 100;

  return (
    <div className="replay">
      <div className="replay__track">
        {/* event-density hatching */}
        <div className="replay__density">
          {points.map((p, i) => (
            <span key={i} className="replay__tick"
              style={{ left: `${(i / Math.max(1, n - 1)) * 100}%`,
                       opacity: p.severity === "CRITICAL" || p.severity === "IMMINENT" ? 0.9 : 0.35,
                       background: p.severity === "CRITICAL" || p.severity === "IMMINENT" ? "var(--vermilion)" : "var(--ink-faint)" }} />
          ))}
        </div>
        <div className="replay__bar" ref={barRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          role="slider" aria-label="Replay timeline" aria-valuemin={0} aria-valuemax={n - 1} aria-valuenow={activeIdx} tabIndex={0}>
          <span className="replay__thumb" style={{ left: `${thumbPct}%` }} />
        </div>
      </div>
      <div className="replay__foot">
        <span className="mx replay__date">{date(points[0].ts)}</span>
        <span className={`replay__now mx${live ? " replay__now--live" : ""}`}>
          {live ? "LIVE" : `${date(points[activeIdx].ts)} · warmth ${Math.round(points[activeIdx].score)}`}
        </span>
        <button className={`replay__live-chip${live ? " replay__live-chip--on" : ""}`} onClick={() => commit(null)}>
          <Icon name="live" size={16} decorative /> LIVE
        </button>
        <span className="mx replay__date">{date(points[n - 1].ts)}</span>
      </div>
    </div>
  );
}
