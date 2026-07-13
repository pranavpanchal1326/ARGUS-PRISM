/* Ink stamp — status as authority mark. One stamp per document face.
   Lands with an 80ms press (scale 1.15→1.0), 1° deterministic jitter
   (seeded by text so a given stamp always sits the same way). */
import "./stamp.css";

type Tone = "ink" | "oxblood" | "brass";

const TONE_FOR: Record<string, Tone> = {
  FROZEN: "oxblood", RETURNED: "oxblood", ESCALATED: "oxblood",
  APPROVED: "brass", SEALED: "brass", SUBMITTED: "brass",
};

function jitter(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((h % 21) - 10) / 10; // -1° .. +1°
}

interface Props {
  children: string;
  tone?: Tone;
  /** animate the press-in when it first appears */
  land?: boolean;
  size?: "sm" | "md";
}

export function InkStamp({ children, tone, land = false, size = "md" }: Props) {
  const t = tone ?? TONE_FOR[children.toUpperCase()] ?? "ink";
  return (
    <span
      className={`stamp stamp--${t} stamp--${size}${land ? " stamp--landing" : ""}`}
      style={{ transform: `rotate(${jitter(children)}deg)` }}
    >
      {children}
    </span>
  );
}
