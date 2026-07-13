/* WarmthScore dial — engraved brass galvanometer. The instrument (brass)
   is fact; the needle's reading and trail (phosphor) is analysis.
   "ARGUS INSTRUMENTS · №1". Sizes: 16 (row) · 48 (card) · 96 (header). */
import { useEffect, useRef, useState } from "react";
import "./dial.css";

const BANDS = ["CLEAN", "WARMING", "HOT", "CRITICAL", "IMMINENT"] as const;

/** score 0..100 → sweep angle. Arc runs -120° to +120°. */
const angleFor = (score: number) => -120 + (Math.min(100, Math.max(0, score)) / 100) * 240;

export function bandFor(score: number): (typeof BANDS)[number] {
  if (score < 20) return "CLEAN";
  if (score < 45) return "WARMING";
  if (score < 70) return "HOT";
  if (score < 88) return "CRITICAL";
  return "IMMINENT";
}

interface Props {
  score: number;
  size?: 16 | 48 | 96;
  showBand?: boolean;
}

export function WarmthDial({ score, size = 48, showBand = false }: Props) {
  const [angle, setAngle] = useState(-120);
  const [trailFrom, setTrailFrom] = useState<number | null>(null);
  const prev = useRef(-120);

  useEffect(() => {
    const target = angleFor(score);
    setTrailFrom(prev.current);
    // sweep on next frame so the transition runs
    const raf = requestAnimationFrame(() => setAngle(target));
    prev.current = target;
    const t = setTimeout(() => setTrailFrom(null), 2000);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [score]);

  const band = bandFor(score);
  const critical = band === "CRITICAL" || band === "IMMINENT";
  const s = size;
  const c = s / 2;
  const r = s * 0.42;

  const arcPoint = (deg: number, radius: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [c + radius * Math.cos(rad), c + radius * Math.sin(rad)];
  };

  // engraved index ticks every 30°
  const ticks = [];
  if (s >= 48) {
    for (let d = -120; d <= 120; d += 30) {
      const [x1, y1] = arcPoint(d, r);
      const [x2, y2] = arcPoint(d, r * 0.86);
      ticks.push(<line key={d} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--brass)" strokeWidth={0.75} opacity={0.7} />);
    }
  }

  const [ax, ay] = arcPoint(-120, r);
  const [bx, by] = arcPoint(120, r);
  const [tx, ty] = trailFrom !== null ? arcPoint(trailFrom, r * 0.94) : [0, 0];
  const [nx, ny] = arcPoint(angle, r * 0.94);

  return (
    <span className={`dial dial--${size}${critical ? " dial--critical" : ""}`}
      role="meter" aria-valuenow={Math.round(score)} aria-valuemin={0} aria-valuemax={100}
      aria-label={`WarmthScore ${Math.round(score)} — ${band}`}
      title={`WarmthScore ${Math.round(score)} · ${band}`}>
      <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s} fill="none">
        {/* engraved arc */}
        <path d={`M ${ax} ${ay} A ${r} ${r} 0 1 1 ${bx} ${by}`}
          stroke="var(--brass)" strokeWidth={s >= 96 ? 1.5 : 1.25} />
        {ticks}
        {/* phosphor trail — the needle's memory, fades in 2s */}
        {trailFrom !== null && (
          <line x1={c} y1={c} x2={tx} y2={ty} stroke="var(--phosphor)" strokeWidth={1}
            className="dial__trail" />
        )}
        {/* the needle — mechanical sweep with heavy settle */}
        <g style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: `${c}px ${c}px`,
          transition: `transform var(--dur-act) var(--ease-mechanical)`,
        }}>
          <line x1={c} y1={c} x2={c} y2={c - r * 0.94}
            stroke={critical ? "var(--oxblood-bright)" : "var(--brass-bright)"}
            strokeWidth={s >= 96 ? 2 : 1.5} strokeLinecap="round" />
        </g>
        <circle cx={c} cy={c} r={s * 0.05} fill="var(--brass)" />
        {/* live phosphor reading dot at needle tip */}
        <circle cx={nx} cy={ny} r={s * 0.035} fill="var(--phosphor)"
          style={{ transition: `all var(--dur-act) var(--ease-mechanical)` }} />
      </svg>
      {s >= 48 && (
        <span className="dial__reading v-machine num">{Math.round(score)}</span>
      )}
      {showBand && <span className={`dial__band v-label${critical ? " dial__band--critical" : ""}`}>{band}</span>}
      {s >= 96 && <span className="dial__maker v-machine">ARGUS INSTRUMENTS · №1</span>}
    </span>
  );
}
