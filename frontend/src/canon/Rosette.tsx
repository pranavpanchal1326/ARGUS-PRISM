/* The Rosette — SVG renderer over the pure engine (Part 8.3 tiers T1–T3).
   Stroke-only, single ink, never filled, never rotated as a spinner.
   Focal tiers draw-on once (M4): the guilloché line scribes itself. */
import { useMemo } from "react";
import {
  rosettePath, rosettePathT1, MASTER_PARAMS, type RosetteParams,
} from "../engine/rosette";

interface Props {
  params?: RosetteParams;          // defaults to the Master Rosette
  size: number;                    // rendered box in px
  tier?: 1 | 2 | 3;
  ink?: string;                    // CSS color; defaults to currentColor
  className?: string;
  title?: string;
  draw?: boolean;                  // play the M4 draw-on scribe on mount
}

export function Rosette({ params = MASTER_PARAMS, size, tier = 2, ink = "currentColor", className, title, draw }: Props) {
  const r = size / 2 - 1;
  const d = useMemo(
    () => (tier === 1 ? rosettePathT1(params, r) : rosettePath(params, r, 0, 0, 3)),
    [params, r, tier],
  );
  const strokeW = tier === 1 ? 0.8 : tier === 2 ? 0.7 : 0.6;
  return (
    <svg
      width={size} height={size}
      viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* pathLength=1 lets us dash/offset in [0,1] without measuring geometry */}
      <path d={d} fill="none" stroke={ink} strokeWidth={strokeW}
        pathLength={draw ? 1 : undefined}
        className={draw ? "rosette-draw" : undefined} />
    </svg>
  );
}
