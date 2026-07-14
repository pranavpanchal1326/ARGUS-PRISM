/* THE ROUTING SLIP (9.14) — the escalation handoff. A deckle-edged
   document capturing the analyst's basis (required, ≥80 chars — the design
   enforces professional handoffs), the auto-attached Worksheet snapshot,
   requested-action punch-marks, and the countersignature line. The paper
   conversation accumulates — audit-real. */
import { useState } from "react";
import { Drawer } from "./Drawer";
import { Seal } from "./Seal";
import { Worksheet } from "./Worksheet";
import { useAuth } from "../shell/AuthContext";
import type { Alert } from "../api/client";
import { timestamp } from "../lib/format";

const ACTIONS = ["FREEZE", "REVIEW", "STR"] as const;
const MIN_BASIS = 80;

interface Props {
  open: boolean;
  alert: Alert | null;
  onClose: () => void;
  onSubmit: (basis: string, actions: string[]) => void;
}

export function RoutingSlip({ open, alert, onClose, onSubmit }: Props) {
  const { me } = useAuth();
  const [basis, setBasis] = useState("");
  const [actions, setActions] = useState<Set<string>>(new Set(["REVIEW"]));

  const ready = basis.trim().length >= MIN_BASIS && actions.size > 0;
  const remaining = Math.max(0, MIN_BASIS - basis.trim().length);

  function toggle(a: string) {
    setActions((s) => { const n = new Set(s); n.has(a) ? n.delete(a) : n.add(a); return n; });
  }

  return (
    <Drawer open={open} title="Routing Slip" refLabel={alert ? `ESCALATE · ${alert.account_ref}` : ""} onClose={onClose}>
      {alert && (
        <div className="routing deckle">
          <section className="routing__block">
            <p className="v-label">The basis <span className="routing__req">required</span></p>
            <textarea className="field__input routing__basis" rows={5} value={basis}
              placeholder="State the basis for escalation. The register keeps reasons, not moods."
              onChange={(e) => setBasis(e.target.value)} />
            <p className={`routing__count mx${remaining ? "" : " routing__count--ok"}`}>
              {remaining ? `${remaining} more characters required` : "Basis sufficient"}
            </p>
          </section>

          <section className="routing__block">
            <p className="v-label">Requested action</p>
            <div className="routing__actions">
              {ACTIONS.map((a) => (
                <button key={a} className={`punch${actions.has(a) ? " punch--active" : ""}`} onClick={() => toggle(a)}>{a}</button>
              ))}
            </div>
          </section>

          <section className="routing__block">
            <p className="v-label">Attached · basis of examination</p>
            <Worksheet signals={alert.top_signals ?? []} />
          </section>

          <section className="routing__sign">
            <p className="mx routing__signline">
              Countersigned · {me?.name ?? "—"} · {me?.role.replace(/_/g, " ") ?? ""} · {timestamp(new Date().toISOString())}
            </p>
            <Seal label="Escalate to MLRO" variant="reserve"
              disabled={!ready} disabledReason={`State at least ${MIN_BASIS} characters of basis`}
              onAuthorize={() => { onSubmit(basis.trim(), [...actions]); setBasis(""); }} />
          </section>
        </div>
      )}
    </Drawer>
  );
}
