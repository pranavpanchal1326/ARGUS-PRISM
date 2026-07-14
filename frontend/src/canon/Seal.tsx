/* THE SEAL — hold-to-authorize (LAW IV, Part 9.2).
   Press-and-hold 900ms while the seal inks and strikes; early release
   drains back and nothing happens. There are no dangerous single-clicks
   anywhere in the product. */
import { useCallback, useRef, useState } from "react";

interface Props {
  label: string;
  variant?: "ink" | "vermilion" | "reserve";
  size?: 40 | 56;
  disabled?: boolean;
  disabledReason?: string;
  busy?: boolean;
  onAuthorize: () => void;
}

const HOLD_MS = 900;

export function Seal({ label, variant = "ink", size = 40, disabled, disabledReason, busy, onAuthorize }: Props) {
  const [progress, setProgress] = useState(0);
  const [struck, setStruck] = useState(false);
  const raf = useRef<number>(0);
  const start = useRef<number>(0);
  const holding = useRef(false);

  const tick = useCallback((now: number) => {
    if (!holding.current) return;
    const p = Math.min(1, (now - start.current) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      holding.current = false;
      setStruck(true);
      setTimeout(() => { setStruck(false); setProgress(0); }, 320);
      onAuthorize();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  }, [onAuthorize]);

  const begin = useCallback(() => {
    if (disabled || busy || holding.current) return;
    holding.current = true;
    start.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  }, [disabled, busy, tick]);

  const release = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    cancelAnimationFrame(raf.current);
    setProgress(0); // ink drains back; nothing happens; no error
  }, []);

  const r = size / 2 - 3;
  const circumference = 2 * Math.PI * r;

  return (
    <button
      type="button"
      className={`seal seal--${variant}${struck ? " seal--struck" : ""}${busy ? " seal--busy" : ""}`}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      aria-label={`${label} — press and hold to authorize`}
      aria-keyshortcuts="Space Enter"
      onPointerDown={begin}
      onPointerUp={release}
      onPointerLeave={release}
      onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); begin(); } }}
      onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") release(); }}
    >
      <span className="seal__ring" style={{ width: size, height: size }} aria-hidden>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* 48-tooth serrated ring */}
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
            strokeWidth={1.5} strokeDasharray={`${circumference / 96} ${circumference / 96}`} />
          {/* radial ink fill, drawn as a thick arc that rises with hold */}
          <circle cx={size / 2} cy={size / 2} r={r / 2} fill="none" stroke="currentColor"
            strokeWidth={r} strokeDasharray={`${Math.PI * r * progress} ${Math.PI * r}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} opacity={0.9} />
        </svg>
      </span>
      <span className="seal__label">{label}</span>
      {progress > 0 && (
        <span className="sr-only" role="progressbar" aria-valuenow={Math.round(progress * 100)} />
      )}
    </button>
  );
}
