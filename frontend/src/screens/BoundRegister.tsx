/* SHEET 09 · THE BOUND REGISTER (Part 10) — audit ledger + verification +
   fairness. The verification mechanism itself is the art: the security
   thread runs the centre gutter; VERIFY pulses light down it while the
   real chain check runs server-side. A broken chain stops at the entry. */
import { useCallback, useEffect, useState } from "react";
import { api, ApiProblem, WatchInterrupted, type AuditRecord, type LedgerVerification, type Fairness } from "../api/client";
import { Overprint } from "../canon/Overprint";
import { Seal } from "../canon/Seal";
import { timestamp } from "../lib/format";
import "./register.css";

type Tab = "register" | "fairness";

export function BoundRegister() {
  const [tab, setTab] = useState<Tab>("register");
  const [entries, setEntries] = useState<AuditRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verify, setVerify] = useState<LedgerVerification | null>(null);
  const [pulsing, setPulsing] = useState(false);
  const [fairness, setFairness] = useState<Fairness | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ data: AuditRecord[] }>("/api/v1/audit?limit=60");
      setEntries(res.data);
    } catch (err) {
      setEntries(null);
      setError(err instanceof WatchInterrupted ? err.message
        : err instanceof ApiProblem ? `${err.title}${err.detail ? ` — ${err.detail}` : ""}`
        : "The register could not be opened.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (tab !== "fairness" || fairness) return;
    (async () => {
      try { const res = await api<{ data: Fairness }>("/api/v1/compliance/fairness"); setFairness(res.data); }
      catch { /* leave null */ }
    })();
  }, [tab, fairness]);

  async function runVerify() {
    setPulsing(true); setVerify(null);
    try {
      const res = await api<{ data: LedgerVerification }>("/api/v1/audit/verify");
      // the pulse travels the thread while the check runs — min(n*8ms, 2400ms)
      const dur = Math.min((entries?.length ?? 0) * 8, 2400);
      setTimeout(() => { setVerify(res.data); setPulsing(false); }, dur);
    } catch (err) {
      setPulsing(false);
      setError(err instanceof ApiProblem ? err.title : "Verification was returned.");
    }
  }

  const brokenAt = verify && !verify.intact ? verify.broken_at ?? null : null;

  return (
    <div className="sheet">
      <div className="margin">
        <h1 className="margin__title">The Bound Register</h1>
        <div className="margin__filters">
          <button className={`punch${tab === "register" ? " punch--active" : ""}`} onClick={() => setTab("register")}>REGISTER</button>
          <button className={`punch${tab === "fairness" ? " punch--active" : ""}`} onClick={() => setTab("fairness")}>FAIRNESS</button>
        </div>
        {tab === "register" && (
          <div style={{ marginTop: "var(--s-6)" }}>
            <Seal label="Verify the ledger" variant="ink" busy={pulsing} onAuthorize={runVerify} />
            {verify && (
              <div className={`verify-block${verify.intact ? "" : " verify-block--broken"}`}>
                {verify.intact
                  ? <Overprint tone="verified" size="body" land>LEDGER INTACT</Overprint>
                  : <Overprint tone="vermilion" size="body" land>CHAIN BROKEN</Overprint>}
                <p className="mx verify-detail">
                  {verify.intact
                    ? `${verify.entries} ENTRIES · VERIFIED ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())} IST`
                    : `CHAIN BROKEN AT ENTRY ${verify.broken_at}. Do not amend. Notify the auditor.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        {tab === "register" ? (
          error ? (
            <div className="misprint"><div className="misprint__stamp"><Overprint tone="vermilion">MISPRINT</Overprint></div><p className="misprint__detail">{error}</p><button className="btn btn--secondary" onClick={() => void load()}>Re-open the register</button></div>
          ) : entries === null ? (
            <div className="register-book">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="register-entry"><span className="unprinted" style={{ width: "50%" }} /></div>)}</div>
          ) : (
            <div className={`register-book${pulsing ? " register-book--pulsing" : ""}`}>
              <span className="thread" aria-hidden />
              {entries.map((e) => (
                <div key={e.seq} className={`register-entry${brokenAt === e.seq ? " register-entry--broken" : ""}`}>
                  <span className="mx register-entry__seq">{e.seq}</span>
                  <span className="mx register-entry__at">{timestamp(e.at)}</span>
                  <span className="register-entry__actor mx">{e.actor}</span>
                  <span className="register-entry__action">{e.action} · {e.target}</span>
                  <span className="mx register-entry__hash">{e.fingerprint}</span>
                </div>
              ))}
            </div>
          )
        ) : (
          <Fairness data={fairness} />
        )}
      </div>
    </div>
  );
}

function Fairness({ data }: { data: Fairness | null }) {
  if (!data) return <div className="void"><span className="unprinted" style={{ width: 260 }} /></div>;
  const max = Math.max(0.01, ...data.segments.map((s) => s.false_positive_rate ?? 0));
  return (
    <div className="fairness">
      <p className="v-label" style={{ display: "block", marginBottom: "var(--s-4)" }}>Flag rate by segment · overall FP {(data.overall_fp_rate * 100).toFixed(1)}%</p>
      {data.segments.map((s) => {
        const rate = s.false_positive_rate ?? 0;
        return (
          <div key={s.segment} className="fair-row">
            <span className="fair-row__seg">{s.segment}</span>
            <span className="fair-row__hatch" style={{ width: `${(rate / max) * 100}%` }} />
            <span className="mx fair-row__val">{(rate * 100).toFixed(1)}%</span>
          </div>
        );
      })}
      <p className="fairness__note">
        Rates are printed, not judged. A segment above baseline is flagged for review, never
        auto-actioned — the DPDP methodology holds that fairness is a reading, not a verdict.
      </p>
    </div>
  );
}
