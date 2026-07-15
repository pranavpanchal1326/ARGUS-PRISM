/* SHEET 04 · THE EXAMINATION DESK (Part 10) — the core loop.
   Master-detail: Margin (count + filters) · Tray (slips in docket order) ·
   Dossier (certificate + worksheet + action rail). LAW V: arrivals
   accumulate in the folio; the operator FEEDS them — the tray a reader
   holds never reorders under the cursor. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, WS_BASE, tokens, ApiProblem, WatchInterrupted, type Alert, type Severity } from "../api/client";
import { Slip } from "../canon/Slip";
import { Worksheet } from "../canon/Worksheet";
import { Rosette } from "../canon/Rosette";
import { Overprint } from "../canon/Overprint";
import { Seal } from "../canon/Seal";
import { RoutingSlip } from "../canon/RoutingSlip";
import { useNotices } from "../canon/Notices";
import { paramsFromScore } from "../engine/rosette";
import { timestamp, slaState } from "../lib/format";
import { useCountUp } from "../lib/motion";
import { LEX } from "../lexicon/strings";
import "./desk.css";

const OPEN = new Set(["NEW", "ACKNOWLEDGED", "ASSIGNED", "ESCALATED"]);
const SEV_RANK: Record<Severity, number> = { IMMINENT: 0, CRITICAL: 1, HOT: 2, WARMING: 3, CLEAN: 4 };
type Filter = "all" | Severity;

export function ExaminationDesk() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get("sel"));

  /* Selection round-trips through the URL (Part 19.2 deep-link grammar) —
     synced in an effect so we never touch the router during render. */
  useEffect(() => {
    setSearchParams((p) => {
      if (selectedId) { if (p.get("sel") !== selectedId) p.set("sel", selectedId); }
      else if (p.has("sel")) p.delete("sel");
      return p;
    }, { replace: true });
  }, [selectedId, setSearchParams]);
  const [examined, setExamined] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Alert[]>([]); // arrivals awaiting FEED
  const [feedIds, setFeedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [, tick] = useState(0);
  const trayRef = useRef<HTMLOListElement | null>(null);
  const { post } = useNotices();

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ data: Alert[] }>("/api/v1/alerts?sort=-warmth_score");
      const open = res.data.filter((a) => OPEN.has(a.status));
      setAlerts(open);
      setSelectedId((cur) => cur ?? open[0]?.id ?? null);
    } catch (err) {
      setAlerts(null);
      setError(err instanceof WatchInterrupted ? err.message
        : err instanceof ApiProblem ? `${err.title}${err.detail ? ` — ${err.detail}` : ""}`
        : LEX.queueError);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60_000); return () => clearInterval(t); }, []);

  /* Live arrivals accumulate as pending — never inserted under the reader. */
  useEffect(() => {
    if (!tokens.access) return;
    let closed = false, retry = 1000;
    const connect = () => {
      const ws = new WebSocket(`${WS_BASE}/api/v1/stream?token=${tokens.access}&channels=alerts`);
      ws.onopen = () => { retry = 1000; };
      ws.onmessage = async (m) => {
        try {
          const ev = JSON.parse(m.data);
          if (ev.type === "alert.raised" && ev.payload?.alert_id) {
            const res = await api<{ data: Alert }>(`/api/v1/alerts/${ev.payload.alert_id}`);
            if (OPEN.has(res.data.status)) {
              setPending((p) => p.some((x) => x.id === res.data.id) ? p : [...p, res.data]);
            }
          }
        } catch { /* signal only */ }
      };
      ws.onclose = () => { if (!closed) { setTimeout(connect, retry); retry = Math.min(retry * 2, 15000); } };
    };
    connect();
    return () => { closed = true; };
  }, []);

  const docket = useMemo(() => {
    if (!alerts) return [];
    const sorted = [...alerts].sort((a, b) =>
      SEV_RANK[a.severity] - SEV_RANK[b.severity] || b.warmth_score - a.warmth_score);
    return filter === "all" ? sorted : sorted.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  const selected = docket.find((a) => a.id === selectedId) ?? null;

  const feed = useCallback(() => {
    if (pending.length === 0) return;
    const ids = new Set(pending.map((p) => p.id));
    setAlerts((cur) => {
      const base = cur ?? [];
      const merged = [...base];
      for (const p of pending) if (!merged.some((x) => x.id === p.id)) merged.push(p);
      return merged;
    });
    setFeedIds(ids);
    setPending([]);
    setTimeout(() => setFeedIds(new Set()), 1600);
  }, [pending]);

  /* Keyboard: J/K traverse, A examined, E escalate, F feed (Part 9.1) */
  const advance = useCallback((dir: 1 | -1) => {
    const i = docket.findIndex((a) => a.id === selectedId);
    const next = docket[Math.min(docket.length - 1, Math.max(0, i + dir))];
    if (next) setSelectedId(next.id);
  }, [docket, selectedId]);

  const advanceFrom = useCallback((id: string) => {
    const i = docket.findIndex((a) => a.id === id);
    const next = docket.slice(i + 1).find((a) => !examined.has(a.id));
    if (next) setSelectedId(next.id);
  }, [docket, examined]);

  /* Examined = acknowledge (reversible). Optimistic; reverts on failure. */
  const markExamined = useCallback(async (id: string) => {
    setExamined((s) => new Set(s).add(id));
    advanceFrom(id);
    try {
      await api(`/api/v1/alerts/${id}`, { method: "PATCH", body: JSON.stringify({ action: "acknowledge" }) });
    } catch (err) {
      setExamined((s) => { const n = new Set(s); n.delete(id); return n; });
      post({ msg: err instanceof ApiProblem ? err.title : "The acknowledgement was returned.", tone: "error" });
    }
  }, [advanceFrom, post]);

  /* False positive = hard-reversible; requires a reason (audit-logged). */
  const falsePositive = useCallback(async (id: string, reason: string) => {
    try {
      await api(`/api/v1/alerts/${id}`, { method: "PATCH", body: JSON.stringify({ action: "mark_false_positive", note: reason }) });
      setAlerts((cur) => (cur ?? []).filter((a) => a.id !== id));
      advanceFrom(id);
      post({ msg: "Marked false positive. The register keeps the reason.", tone: "success" });
    } catch (err) {
      post({ msg: err instanceof ApiProblem ? err.title : "The dismissal was returned.", tone: "error" });
    }
  }, [advanceFrom, post]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "j" || e.key === "J") { e.preventDefault(); advance(1); }
      else if (e.key === "k" || e.key === "K") { e.preventDefault(); advance(-1); }
      else if (e.key === "a" || e.key === "A") { if (selectedId) markExamined(selectedId); }
      else if (e.key === "f" || e.key === "F") { feed(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, markExamined, feed, selectedId]);

  const count = alerts?.length ?? 0;

  if (error) {
    return (
      <Frame count={0} filter={filter} setFilter={setFilter}>
        <div className="misprint">
          <div className="misprint__stamp"><Overprint tone="vermilion">MISPRINT</Overprint></div>
          <p className="misprint__detail">{error}</p>
          <button className="btn btn--secondary" onClick={() => void load()}>Re-run the sheet</button>
        </div>
      </Frame>
    );
  }

  if (alerts === null) {
    return (
      <Frame count={0} filter={filter} setFilter={setFilter}>
        <ol className="tray">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="slip"><span className="unprinted" style={{ width: "60%", margin: "auto 0" }} /></li>
          ))}
        </ol>
      </Frame>
    );
  }

  if (count === 0) {
    return (
      <Frame count={0} filter={filter} setFilter={setFilter}>
        <div className="void">
          <Rosette params={paramsFromScore(0, [], "clean")} size={120} tier={3} title="A clean rosette" />
          <p className="void__line">{LEX.queueEmpty}</p>
        </div>
      </Frame>
    );
  }

  return (
    <Frame count={count} filter={filter} setFilter={setFilter} pending={pending.length} onFeed={feed}>
      <div className="desk">
        <div className="desk__tray">
          <ol className="tray tray--entrance" ref={trayRef}>
            {docket.map((a, i) => (
              <Slip key={a.id} alert={a} docket={i + 1}
                selected={a.id === selectedId} examined={examined.has(a.id)}
                feed={feedIds.has(a.id)} order={i}
                onSelect={() => setSelectedId(a.id)} />
            ))}
          </ol>
        </div>
        <div className="desk__dossier">
          {selected ? (
            <Dossier alert={selected}
              onExamined={() => void markExamined(selected.id)}
              onFalsePositive={(reason) => void falsePositive(selected.id, reason)} />
          ) : null}
        </div>
      </div>
    </Frame>
  );
}

function Frame({ count, filter, setFilter, pending = 0, onFeed, children }: {
  count: number; filter: Filter; setFilter: (f: Filter) => void;
  pending?: number; onFeed?: () => void; children: React.ReactNode;
}) {
  const FILTERS: Filter[] = ["all", "IMMINENT", "CRITICAL", "HOT", "WARMING"];
  const shownCount = Math.round(useCountUp(count));
  return (
    <div className="sheet">
      <div className="margin">
        <div className="margin__count-label">{LEX.awaiting}</div>
        <div className="margin__count num">{shownCount}</div>
        {pending > 0 && (
          <button className="feed-note" onClick={onFeed}>{LEX.feed(pending)}</button>
        )}
        <div className="margin__filters">
          {FILTERS.map((f) => (
            <button key={f} className={`punch${filter === f ? " punch--active" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "ALL" : f}
            </button>
          ))}
        </div>
        <p className="margin__note">{LEX.docketPolicy}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Dossier({ alert, onExamined, onFalsePositive }: {
  alert: Alert; onExamined: () => void; onFalsePositive: (reason: string) => void;
}) {
  const [routing, setRouting] = useState(false);
  const [fpOpen, setFpOpen] = useState(false);
  const [fpReason, setFpReason] = useState("");
  const { post } = useNotices();
  const shownScore = Math.round(useCountUp(alert.warmth_score));
  const params = paramsFromScore(
    alert.warmth_score,
    (alert.top_signals ?? []).map((s) => s.contribution),
    alert.account_ref,
  );
  const sla = alert.sla_deadline ? slaState(alert.sla_deadline, alert.first_signal_at) : null;

  async function escalate(basis: string, actions: string[]) {
    try {
      await api(`/api/v1/alerts/${alert.id}`, { method: "PATCH", body: JSON.stringify({ action: "assign", note: `ESCALATE [${actions.join("/")}] ${basis}` }) });
      post({ msg: `${alert.account_ref} routed to MLRO. Slip filed with audit ref.`, tone: "success" });
    } catch (err) {
      post({ msg: err instanceof ApiProblem ? err.title : "The routing slip was returned.", tone: "error" });
    }
    setRouting(false);
    onExamined();
  }

  return (
    <article className="dossier card">
      <header className="certificate">
        <Rosette key={alert.id} params={params} size={72} tier={2} draw />
        <div className="certificate__id">
          <span className="mx certificate__serial">{alert.account_ref}</span>
          <span className="v-label">{alert.severity} · {alert.status}</span>
        </div>
        <div className="certificate__score">
          <span className="num v-display" style={{ fontSize: "var(--text-28)", fontWeight: 600, fontFamily: "var(--font-machine)" }}>
            {shownScore}
          </span>
          {alert.status === "ESCALATED" && <Overprint tone="vermilion" size="body" land>ESCALATED</Overprint>}
        </div>
      </header>

      <Worksheet signals={alert.top_signals ?? []} />

      <div className="dossier__sla">
        <span className="v-label">STR DEADLINE (PMLA §12)</span>
        {sla ? (
          <span className={`mx${sla.overdue ? " slip__sla--overdue" : ""}`} title={alert.sla_deadline ? timestamp(alert.sla_deadline) : ""}>
            {sla.overdue ? `OVERDUE ${sla.label.replace("OVERDUE ", "")}` : `${sla.label} remaining`}
          </span>
        ) : <span className="mx">—</span>}
      </div>

      <footer className="dossier__actions">
        <button className="btn btn--quiet" onClick={onExamined}>Mark examined</button>
        <button className="btn btn--secondary" onClick={() => setRouting(true)}>Escalate</button>
        {!fpOpen && <button className="btn btn--quiet" onClick={() => setFpOpen(true)}>False positive</button>}
      </footer>

      {fpOpen && (
        <div className="fp-reason">
          <label className="field">
            <span className="field__label">{LEX.fpReason}</span>
            <input className="field__input" autoFocus value={fpReason}
              placeholder="State the basis…" onChange={(e) => setFpReason(e.target.value)} />
          </label>
          <div className="fp-reason__actions">
            <Seal label="Confirm false positive" variant="ink"
              disabled={fpReason.trim().length < 3} disabledReason="A reason is required"
              onAuthorize={() => { onFalsePositive(fpReason.trim()); setFpOpen(false); setFpReason(""); }} />
            <button className="btn btn--quiet" onClick={() => { setFpOpen(false); setFpReason(""); }}>Cancel</button>
          </div>
        </div>
      )}

      <RoutingSlip open={routing} alert={alert} onClose={() => setRouting(false)} onSubmit={escalate} />
    </article>
  );
}
