/* Severity marks — printed shape + ink + label; never color alone (Part 5.3). */
import type { Severity } from "../api/client";

export function SeverityMark({ severity }: { severity: Severity }) {
  const label = severity.toLowerCase();
  return (
    <span className={`sevmark sevmark--${label}`} role="img" aria-label={`Severity: ${label}`}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        {severity === "CLEAN" && <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />}
        {severity === "WARMING" && <rect x="4" y="4" width="4" height="4" fill="currentColor" />}
        {severity === "HOT" && <>
          <line x1="2" y1="4.5" x2="10" y2="4.5" stroke="currentColor" strokeWidth="2" />
          <line x1="2" y1="8.5" x2="10" y2="8.5" stroke="currentColor" strokeWidth="2" />
        </>}
        {severity === "CRITICAL" && <path d="M6 2 L10.5 10 H1.5 Z" fill="currentColor" />}
        {severity === "IMMINENT" && <>
          <path d="M6 2 L10.5 10 H1.5 Z" fill="currentColor" />
          <circle cx="6" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1" />
        </>}
      </svg>
    </span>
  );
}
