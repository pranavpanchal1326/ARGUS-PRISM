/* THE SLIP (9.1) — the examination row. Readable in under one second:
   severity · identity · evidence · deadline. */
import { Rosette } from "./Rosette";
import { SeverityMark } from "./SeverityMark";
import { Overprint } from "./Overprint";
import { paramsFromScore } from "../engine/rosette";
import { slaState, timestamp } from "../lib/format";
import { moneyShort } from "../lib/format";
import type { Alert } from "../api/client";

interface Props {
  alert: Alert;
  docket: number;
  selected: boolean;
  examined: boolean;
  feed?: boolean;
  order?: number;
  amountAtRisk?: number;
  onSelect: () => void;
}

export function Slip({ alert, docket, selected, examined, feed, order = 0, amountAtRisk, onSelect }: Props) {
  const critical = alert.severity === "CRITICAL" || alert.severity === "IMMINENT";
  const sla = alert.sla_deadline ? slaState(alert.sla_deadline, alert.first_signal_at) : null;
  const params = paramsFromScore(
    alert.warmth_score,
    (alert.top_signals ?? []).map((s) => s.contribution),
    alert.account_ref,
  );
  const summary = (alert.top_signals ?? [])[0]?.label ?? "Signals detected";

  return (
    <li
      className={`slip${critical ? " slip--critical" : ""}${selected ? " slip--selected" : ""}${examined ? " slip--examined" : ""}${feed ? " slip--feed" : ""}`}
      style={{ ["--slip-order" as string]: String(Math.min(order, 12)) }}
      onClick={onSelect}
      aria-current={selected}
    >
      <span className="slip__sev"><SeverityMark severity={alert.severity} /></span>
      <span className="slip__docket">Nº {docket}</span>
      <span className="slip__ref">{alert.account_ref}</span>
      <Rosette params={params} size={14} tier={1} />
      <span className="slip__summary" title={summary}>{summary}</span>
      <span className="slip__signals">{(alert.top_signals ?? []).slice(0, 2).map((s) => s.code).join(" ")}</span>
      <span className="slip__amount">{amountAtRisk != null ? moneyShort(amountAtRisk) : "—"}</span>
      {sla ? (
        <span className={`slip__sla${sla.overdue ? " slip__sla--overdue" : ""}`}
          title={alert.sla_deadline ? timestamp(alert.sla_deadline) : undefined}>
          {sla.overdue ? <Overprint tone="vermilion" size="micro">OVERDUE</Overprint> : sla.label}
        </span>
      ) : <span className="slip__sla">—</span>}
    </li>
  );
}
