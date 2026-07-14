/* THE OVERPRINT — stamped status (Part 9.3). Deterministic tilt from
   the text hash; lands with M9 exactly once. */
import { hashSeed } from "../engine/rosette";

interface Props {
  children: string;
  tone?: "ink" | "vermilion" | "verified";
  size?: "micro" | "body" | "full";
  land?: boolean; // play the M9 strike on mount
}

export function Overprint({ children, tone = "ink", size = "body", land = false }: Props) {
  const tilt = ((hashSeed(children) % 200) / 100 - 1).toFixed(2); // −1°..+1°
  return (
    <span
      className={`overprint overprint--${tone} overprint--${size}${land ? " overprint--land" : ""}`}
      style={{ ["--stamp-tilt" as string]: `${tilt}deg` }}
    >
      {children}
    </span>
  );
}
