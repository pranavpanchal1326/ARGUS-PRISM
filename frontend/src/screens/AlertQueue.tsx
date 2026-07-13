/* Alert Queue — "The Morning Telegrams." Default landing view.
   Brass in-trays by severity, the canonical 36px alert row, live WS
   arrivals, honest empty & error states. All data from the contract. */
import { useCallback, useEffect, useRef, useState } from "react";
import { api, WS_BASE, tokens, ApiProblem, WatchInterrupted, type Alert, type Severity } from "../api/client";
import { WarmthDial } from "../components/WarmthDial";
import { Eye } from "../components/Eye";
import { InkStamp } from "../components/InkStamp";
import { slaState, since, timestamp } from "../lib/format";
import "./alerts.css";

const TRAY_ORDER: Severity[] = ["IMMINENT", "CRITICAL", "HOT", "WARMING", "CLEAN"];

export function AlertQueue() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [arrived, setArrived] = useState<Set<string>>(new Set());
  const [, forceTick] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const OPEN = new Set(["NEW", "ACKNOWLEDGED", "ASSIGNED", "ESCALATED"]);
      const res = await api<{ data: Alert[] }>("/api/v1/alerts?sort=-warmth_score");
      setAlerts(res.data.filter((a) => OPEN.has(a.status)));
    } catch (err) {
      setAlerts(null);
      setError(err instanceof WatchInterrupted ? err.message
        : err instanceof ApiProblem ? `${err.title}${err.detail ? ` — ${err.detail}` : ""}`
        : "The alerts could not be retrieved.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /* SLA clocks tick each minute */
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  /* Live arrivals: alerts channel; on reconnect, reload (backfill, no gaps) */
  useEffect(() => {
    if (!tokens.access) return;
    let closed = false;
    let retry = 1000;
    const connect = () => {
      const ws = new WebSocket(`${WS_BASE}/api/v1/stream?token=${tokens.access}&channels=alerts`);
      wsRef.current = ws;
      ws.onopen = () => { retry = 1000; void load(); };
      ws.onmessage = (m) => {
        try {
          const ev = JSON.parse(m.data);
          // The WS event is a signal, not the record. The queue always
          // refetches from /alerts — the single source of truth (Law 2).
          if (ev.type === "alert.raised" && ev.payload?.alert_id) {
            const id = String(ev.payload.alert_id);
            setArrived((s) => new Set(s).add(id));
            setTimeout(() => setArrived((s) => { const n = new Set(s); n.delete(id); return n; }), 1600);
            if (reloadTimer.current) clearTimeout(reloadTimer.current);
            reloadTimer.current = setTimeout(() => void load(), 400); // burst-debounced
          }
        } catch { /* ignore non-JSON frames */ }
      };
      ws.onclose = () => {
        if (!closed) { setTimeout(connect, retry); retry = Math.min(retry * 2, 15000); }
      };
    };
    connect();
    return () => { closed = true; wsRef.current?.close(); };
  }, [load]);

  if (error) {
    return (
      <div>
        <h1 className="screen-title">Alert Queue</h1>
        <div className="void-state">
          <Eye state="closed" size={28} />
          <p className="void-state__epigraph v-institution">The watch is interrupted.</p>
          <p className="void-state__detail v-machine">{error}</p>
          <button className="btn-brass" onClick={() => void load()}>Resume the watch</button>
        </div>
      </div>
    );
  }

  if (alerts === null) {
    return (
      <div>
        <h1 className="screen-title">Alert Queue</h1>
        <div className="tray">
          <div className="tray__head"><span className="v-label">Retrieving the morning telegrams…</span></div>
          {[0, 1, 2].map((i) => <div key={i} className="row-skeleton" />)}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div>
        <h1 className="screen-title">Alert Queue</h1>
        <div className="void-state">
          <Eye state="closed" size={28} title="The eye rests" />
          <p className="void-state__epigraph v-institution">Nothing stirs. The watch continues.</p>
          <p className="void-state__detail">No alerts require attention.</p>
        </div>
      </div>
    );
  }

  const trays = TRAY_ORDER
    .map((sev) => ({ sev, items: alerts.filter((a) => a.severity === sev) }))
    .filter((t) => t.items.length > 0);

  return (
    <div>
      <h1 className="screen-title">Alert Queue</h1>
      {trays.map(({ sev, items }) => (
        <section key={sev} className={`tray tray--${sev.toLowerCase()}`}>
          <div className="tray__head">
            <span className={`tray__sev v-label${sev === "CRITICAL" || sev === "IMMINENT" ? " tray__sev--critical" : ""}`}>
              {sev}
            </span>
            <span className="tray__count v-machine num">{items.length}</span>
            <span className="tray__rule" />
          </div>
          <ol className="tray__list">
            {items.map((a) => (
              <AlertRow key={a.id} alert={a} justArrived={arrived.has(a.id)} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function AlertRow({ alert, justArrived }: { alert: Alert; justArrived: boolean }) {
  const critical = alert.severity === "CRITICAL" || alert.severity === "IMMINENT";
  const sla = alert.sla_deadline ? slaState(alert.sla_deadline, alert.first_signal_at) : null;

  return (
    <li className={`arow${justArrived ? " arow--arrived" : ""}`}>
      <span className={`arow__notch${critical ? " arow__notch--critical" : ""}`} aria-hidden />
      <span className="arow__ref v-machine">{alert.account_ref}</span>
      <span className="arow__signals">
        {(alert.top_signals ?? []).slice(0, 2).map((s) => (
          <span key={s.code} className="chip" title={`${s.label} · +${s.contribution.toFixed(1)} warmth`}>
            {s.code} · {s.label}
          </span>
        ))}
      </span>
      <span className="arow__since v-machine" title={timestamp(alert.first_signal_at)}>
        {since(alert.first_signal_at)}
      </span>
      {alert.taint_linked && <InkStamp size="sm" tone="oxblood">TAINT</InkStamp>}
      {sla && (
        <span
          className={`arow__sla v-machine${sla.overdue ? " arow__sla--overdue" : ""}`}
          style={{ ["--burn" as string]: sla.burn }}
          title={`STR filing deadline (PMLA §12): ${timestamp(alert.sla_deadline!)}`}
        >
          {sla.overdue ? <InkStamp size="sm" tone="oxblood">OVERDUE</InkStamp> : `SLA ${sla.label}`}
        </span>
      )}
      <WarmthDial score={alert.warmth_score} size={16} />
      <span className="arow__score v-machine num">{Math.round(alert.warmth_score)}</span>
    </li>
  );
}
