/* HATCH CHARTS (9.5) — the proprietary data-viz grammar. Score history as a
   1.5px ink line with intaglio hatching beneath whose density maps value;
   band thresholds as labeled hairlines; events as margin ticks. Drawn with
   our own thin SVG renderer — no chart library (they reintroduce gradients
   and the generic look in one import). Every chart is a FIGURE with a caption. */
import { useMemo } from "react";
import type { ScorePoint } from "../api/client";
import { date } from "../lib/format";

const BANDS = [
  { at: 40, label: "WARMING" },
  { at: 60, label: "HOT" },
  { at: 80, label: "CRITICAL" },
];

export function HatchChart({ points, caption }: { points: ScorePoint[]; caption: string }) {
  const W = 640, H = 220, PAD = 28;
  const path = useMemo(() => {
    if (points.length === 0) return { line: "", area: "" };
    const n = points.length;
    const x = (i: number) => PAD + (i / Math.max(1, n - 1)) * (W - PAD * 2);
    const y = (s: number) => H - PAD - (Math.min(100, Math.max(0, s)) / 100) * (H - PAD * 2);
    let line = "", area = `M${x(0)} ${H - PAD}`;
    points.forEach((p, i) => {
      const cmd = i === 0 ? "M" : "L";
      line += `${cmd}${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`;
      area += `L${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`;
    });
    area += `L${x(n - 1)} ${H - PAD}Z`;
    return { line, area };
  }, [points]);

  const yFor = (s: number) => H - PAD - (s / 100) * (H - PAD * 2);

  return (
    <figure className="hatch-fig">
      <svg viewBox={`0 0 ${W} ${H}`} className="hatch-svg" role="img" aria-label={caption}>
        <defs>
          <pattern id="hatch45" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="4" stroke="var(--intaglio)" strokeWidth="1" />
          </pattern>
        </defs>
        {/* band threshold hairlines */}
        {BANDS.map((b) => (
          <g key={b.label}>
            <line x1={PAD} y1={yFor(b.at)} x2={W - PAD} y2={yFor(b.at)} stroke="var(--rule)" strokeWidth="1" strokeDasharray="2 3" />
            <text x={W - PAD} y={yFor(b.at) - 3} className="hatch-band" textAnchor="end">{b.label}</text>
          </g>
        ))}
        {/* area hatch + line (the line scribes itself, M4) */}
        {path.area && <path d={path.area} fill="url(#hatch45)" opacity="0.5" className="hatch-area" />}
        {path.line && <path d={path.line} fill="none" stroke="var(--ink)" strokeWidth="1.5" pathLength={1} className="hatch-line" />}
        {/* event margin ticks for band crossings into CRITICAL */}
        {points.map((p, i) => p.severity === "CRITICAL" || p.severity === "IMMINENT" ? (
          <circle key={i} cx={PAD + (i / Math.max(1, points.length - 1)) * (W - PAD * 2)} cy={PAD - 6} r="2" fill="var(--vermilion)" />
        ) : null)}
        {/* axis rules */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--rule-strong)" strokeWidth="1" />
      </svg>
      <figcaption className="hatch-caption">
        {caption}
        {points.length > 0 && (
          <span className="mx"> · {date(points[0].ts)} — {date(points[points.length - 1].ts)}</span>
        )}
      </figcaption>
    </figure>
  );
}
