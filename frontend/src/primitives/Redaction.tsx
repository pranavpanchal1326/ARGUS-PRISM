/* THE REDACTION BAR (9.17) — PII masking. A solid ink bar; fixed width
   regardless of true length (no length leaks). MLRO unmask is a small
   inline Seal (900ms hold, audit-logged); unmasked values auto-re-mask
   after 60s, and the re-masking prints a tiny RESEALED mark. RBAC made
   visible and demo-narratable. */
import { useEffect, useRef, useState } from "react";
import { Seal } from "../canon/Seal";
import { Overprint } from "../canon/Overprint";
import { useAuth } from "../shell/AuthContext";

const REMASK_MS = 60_000;

export function Redaction({ value, canUnmask }: { value: string; canUnmask?: boolean }) {
  const { me } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const [resealed, setResealed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mayUnmask = canUnmask ?? me?.role === "MLRO";

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function unmask() {
    setRevealed(true); setResealed(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setRevealed(false); setResealed(true); setTimeout(() => setResealed(false), 2000); }, REMASK_MS);
  }

  if (revealed) {
    return <span className="mx redaction redaction--open">{value}</span>;
  }
  return (
    <span className="redaction">
      <span className="redaction__bar" aria-label="Redacted — MLRO clearance required" title="MLRO clearance required">
        {"██████"}
      </span>
      {resealed && <Overprint size="micro" tone="ink">RESEALED</Overprint>}
      {mayUnmask && !resealed && (
        <Seal label="Unmask" variant="reserve" size={40} onAuthorize={unmask} />
      )}
    </span>
  );
}
