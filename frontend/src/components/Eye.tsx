/* The Eye — the resident of the Margin. Engraved, never decorative.
   States: resting · watching (iris brightness = event velocity) ·
   blink (rate-limited ≥8s) · closed (empty/offline — "the eye rests"). */
import { useEffect, useRef, useState } from "react";
import "./eye.css";

export type EyeState = "resting" | "watching" | "closed";

interface Props {
  state?: EyeState;
  /** 0..1 — live event velocity drives iris brightness while watching */
  intensity?: number;
  size?: number;
  /** call to request a blink; internally rate-limited to one per 8s */
  blinkSignal?: number;
  title?: string;
}

const BLINK_COOLDOWN = 8000;

export function Eye({ state = "resting", intensity = 0, size = 14, blinkSignal = 0, title }: Props) {
  const [blinking, setBlinking] = useState(false);
  const lastBlink = useRef(0);

  useEffect(() => {
    if (!blinkSignal || state === "closed") return;
    const now = Date.now();
    if (now - lastBlink.current < BLINK_COOLDOWN) return;
    lastBlink.current = now;
    setBlinking(true);
    const t = setTimeout(() => setBlinking(false), 300);
    return () => clearTimeout(t);
  }, [blinkSignal, state]);

  const irisOpacity = state === "closed" ? 0 : state === "watching" ? 0.4 + intensity * 0.6 : 0.4;
  const lid = state === "closed" ? 1 : blinking ? 1 : 0;

  return (
    <span
      className={`eye eye--${state}${blinking ? " eye--blinking" : ""}`}
      role="img"
      aria-label={title ?? (state === "closed" ? "The eye rests" : "ARGUS watches")}
      title={title}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        {/* engraved almond outline */}
        <path d="M2 12C5.5 6.5 9 4.5 12 4.5S18.5 6.5 22 12C18.5 17.5 15 19.5 12 19.5S5.5 17.5 2 12Z"
          stroke="var(--brass)" strokeWidth="1.25" />
        {/* hatch lines — Doré engraving */}
        <path d="M4.5 10.2C7 7.4 9.5 6.2 12 6.2M4.5 13.8C7 16.6 9.5 17.8 12 17.8"
          stroke="var(--brass)" strokeWidth="0.5" opacity="0.5" />
        {/* phosphor iris — the only light in the glyph */}
        <circle cx="12" cy="12" r="3.4" stroke="var(--phosphor)" strokeWidth="1.25"
          style={{ opacity: irisOpacity, transition: "opacity 600ms var(--ease-optical)" }} />
        <circle cx="12" cy="12" r="1" fill="var(--phosphor)"
          style={{ opacity: irisOpacity, transition: "opacity 600ms var(--ease-optical)" }} />
        {/* the lid — closes over everything */}
        <path d="M2 12C5.5 6.5 9 4.5 12 4.5S18.5 6.5 22 12C18.5 17.5 15 19.5 12 19.5S5.5 17.5 2 12Z"
          fill="var(--vault-900)" stroke="var(--brass)" strokeWidth="1.25"
          className="eye__lid"
          style={{ opacity: lid, transition: "opacity 140ms var(--ease-mechanical)" }} />
        {/* closed-lid seam */}
        {state === "closed" && (
          <path d="M3 12H21" stroke="var(--brass)" strokeWidth="1.25" opacity="0.8" />
        )}
      </svg>
    </span>
  );
}
