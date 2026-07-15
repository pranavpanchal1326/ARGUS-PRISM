/* SHEET 05 · THE SPECIMEN BOOK (Part 10) — lookup + full forensic view.
   Phase A: the book (search + specimen cards). Phase B: the certificate. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiProblem, WatchInterrupted, type AccountSummary, type Account, type AccountTransaction, type ScorePoint } from "../api/client";
import { Rosette } from "../canon/Rosette";
import { Overprint } from "../canon/Overprint";
import { Worksheet } from "../canon/Worksheet";
import { Seal } from "../canon/Seal";
import { SeverityMark } from "../canon/SeverityMark";
import { Comparator } from "../canon/Comparator";
import { HatchChart } from "../canon/HatchChart";
import { Replay } from "../canon/Replay";
import { Redaction } from "../primitives/Redaction";
import { useNotices } from "../canon/Notices";
import { paramsFromScore } from "../engine/rosette";
import { money, date, timestamp } from "../lib/format";

interface DeviceEvent { imei: string; event_type: string; registered_at: string; }
import "./specimen.css";

export function SpecimenBook() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AccountSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    setError(null);
    try {
      const qs = q.trim().length >= 2 ? `?query=${encodeURIComponent(q.trim())}` : "";
      const res = await api<{ data: AccountSummary[] }>(`/api/v1/accounts${qs}`);
      setResults(res.data);
    } catch (err) {
      setResults(null);
      setError(err instanceof WatchInterrupted ? err.message
        : err instanceof ApiProblem ? `${err.title}${err.detail ? ` — ${err.detail}` : ""}`
        : "The register could not be read.");
    }
  }, []);

  useEffect(() => { void search(""); }, [search]);

  function onQuery(v: string) {
    setQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void search(v), 220);
  }

  if (selected) {
    return <Certificate id={selected} onClose={() => setSelected(null)} />;
  }

  return (
    <div className="sheet">
      <div className="margin">
        <h1 className="margin__title">The Specimen Book</h1>
        <label className="field specimen__search">
          <span className="field__label">Search the register</span>
          <input className="field__input" value={query} placeholder="serial or holder"
            onChange={(e) => onQuery(e.target.value)} autoFocus />
        </label>
        {results && <p className="margin__note">{results.length} specimen{results.length === 1 ? "" : "s"} on the sheet.</p>}
      </div>

      <div>
        {error ? (
          <div className="misprint">
            <div className="misprint__stamp"><Overprint tone="vermilion">MISPRINT</Overprint></div>
            <p className="misprint__detail">{error}</p>
            <button className="btn btn--secondary" onClick={() => void search(query)}>Re-run the sheet</button>
          </div>
        ) : results === null ? (
          <div className="specimen-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="specimen-card card"><span className="unprinted" style={{ width: "70%" }} /></div>)}
          </div>
        ) : results.length === 0 ? (
          <div className="void">
            <Rosette params={paramsFromScore(0, [], "none")} size={96} tier={3} ink="var(--ink-faint)" />
            <p className="void__line">No specimen matches.</p>
            <p className="void__detail">Check the serial.</p>
          </div>
        ) : (
          <div className="specimen-grid">
            {results.map((a) => (
              <button key={a.id} className="specimen-card card" onClick={() => setSelected(a.id)}>
                <Rosette params={paramsFromScore(a.warmth_score, [], a.account_ref)} size={56} tier={2} />
                <div className="specimen-card__body">
                  <span className="mx specimen-card__ref">{a.account_ref}</span>
                  <span className="specimen-card__holder">{a.holder}</span>
                  <span className="specimen-card__meta">
                    <SeverityMark severity={a.severity} />
                    <span className="v-label">{a.status}</span>
                    {a.tainted && <Overprint tone="vermilion" size="micro">TAINT</Overprint>}
                  </span>
                </div>
                <span className="mx specimen-card__score num">{Math.round(a.warmth_score)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Certificate({ id, onClose }: { id: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [acct, setAcct] = useState<Account | null>(null);
  const [txns, setTxns] = useState<AccountTransaction[] | null>(null);
  const [history, setHistory] = useState<ScorePoint[] | null>(null);
  const [devices, setDevices] = useState<DeviceEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [scrubIdx, setScrubIdx] = useState<number | null>(null); // null = live
  const { post } = useNotices();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "c" || e.key === "C") setComparing(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ data: Account }>(`/api/v1/accounts/${id}`);
        setAcct(res.data);
      } catch (err) {
        setError(err instanceof ApiProblem ? err.title : "The certificate could not be printed.");
      }
    })();
    (async () => {
      try {
        const res = await api<{ data: AccountTransaction[] }>(`/api/v1/accounts/${id}/transactions?limit=20`);
        setTxns(res.data);
      } catch { setTxns([]); }
    })();
    // Each section loads independently — one slow endpoint never blanks the document.
    (async () => {
      try { const res = await api<{ data: ScorePoint[] }>(`/api/v1/accounts/${id}/score-history`); setHistory(res.data); }
      catch { setHistory([]); }
    })();
    (async () => {
      try { const res = await api<{ data: DeviceEvent[] }>(`/api/v1/accounts/${id}/devices`); setDevices(res.data); }
      catch { setDevices([]); }
    })();
  }, [id]);

  if (error) {
    return (
      <div>
        <button className="btn btn--quiet" onClick={onClose}>← Return to the book</button>
        <div className="misprint"><div className="misprint__stamp"><Overprint tone="vermilion">MISPRINT</Overprint></div><p className="misprint__detail">{error}</p></div>
      </div>
    );
  }
  if (!acct) return <div className="void"><span className="unprinted" style={{ width: 220 }} /></div>;

  // When scrubbing, the header rosette + score tween to the historical point.
  const scrubPoint = scrubIdx !== null && history ? history[scrubIdx] : null;
  const shownScore = scrubPoint ? scrubPoint.score : acct.warmth_score;
  const shownSignals = scrubPoint?.shap ?? acct.top_signals ?? [];
  const params = paramsFromScore(shownScore, shownSignals.map((s) => s.contribution), acct.account_ref);
  const frozen = acct.status === "FROZEN";

  return (
    <div className="certificate-sheet">
      <button className="btn btn--quiet" onClick={onClose}>← Return to the book</button>

      <header className={`cert-head card${scrubPoint ? " cert-head--replaying" : ""}`}>
        <Rosette params={params} size={96} tier={3} draw={!scrubPoint} />
        <div className="cert-head__id">
          <span className="mx cert-head__ref">{acct.account_ref}</span>
          <span className="cert-head__holder">
            {acct.pii_masked ? <Redaction value={acct.holder} /> : acct.holder}
          </span>
          <span className="v-label">{acct.segment ?? "—"} · {acct.kyc_status} · opened {date(acct.opened_at)}</span>
        </div>
        <div className="cert-head__score">
          <span className="mx num cert-head__denom">{Math.round(shownScore)}</span>
          {frozen && !scrubPoint && <Overprint tone="vermilion" size="full" land>FROZEN</Overprint>}
        </div>
      </header>

      <section className="cert-section">
        <p className="v-label">Specifications · S1–S6</p>
        <div className="spec-ledger">
          {(acct.top_signals ?? []).length === 0 ? <p className="void__detail">No signals recorded.</p> :
            (acct.top_signals ?? []).map((s) => (
              <div key={s.code} className="spec-row">
                <span className="mx spec-row__code">{s.code}</span>
                <span className="spec-row__name">{s.label}</span>
                <span className="spec-row__hatch" style={{ width: `${Math.min(100, Math.abs(s.contribution) * 2.5)}%` }} />
                <span className="mx spec-row__val num">{s.contribution >= 0 ? "+" : ""}{s.contribution.toFixed(1)}</span>
              </div>
            ))}
        </div>
      </section>

      <section className="cert-section">
        <Worksheet signals={acct.top_signals ?? []} />
      </section>

      <section className="cert-section">
        <p className="v-label">Impression history</p>
        {history === null ? <span className="unprinted" style={{ width: "60%" }} /> :
          history.length === 0 ? <p className="void__detail">No history on the sheet.</p> :
          <>
            <HatchChart points={history} caption="WARMTH OVER TIME" />
            <Replay points={history} onScrub={setScrubIdx} />
          </>}
      </section>

      <section className="cert-section">
        <p className="v-label">Devices</p>
        {devices === null ? <span className="unprinted" style={{ width: "40%" }} /> :
          devices.length === 0 ? <p className="void__detail">No device events recorded.</p> : (
          <table className="ledger">
            <thead><tr><th>IMEI</th><th>Event</th><th className="ledger__r">Registered</th></tr></thead>
            <tbody>
              {devices.map((d, i) => (
                <tr key={i}>
                  <td className="mx">{d.imei}</td>
                  <td>{d.event_type}</td>
                  <td className="mx ledger__r">{timestamp(d.registered_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="cert-section">
        <p className="v-label">Transactions</p>
        {txns === null ? <span className="unprinted" style={{ width: "50%" }} /> : txns.length === 0 ? (
          <p className="void__detail">No transactions on the sheet.</p>
        ) : (
          <table className="ledger">
            <thead>
              <tr><th>Dateline</th><th>Counterparty</th><th>Channel</th><th className="ledger__r">Amount</th></tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id}>
                  <td className="mx">{timestamp(t.ts)}</td>
                  <td className="mx">{t.counterparty_ref ?? "external"}</td>
                  <td>{t.channel}</td>
                  <td className={`mx ledger__r${t.direction === "OUT" ? " ledger__out" : ""}`}>{money(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="cert-section">
        <p className="v-label">Linked plates</p>
        <button className="linked-plate" onClick={() => navigate(`/graph?focus=${encodeURIComponent(acct.account_ref)}&hops=2`)}>
          <Rosette params={params} size={40} tier={2} />
          <span className="linked-plate__label">Open the 2-hop neighbourhood on the Engraver's Plate →</span>
        </button>
      </section>

      <footer className="cert-actions">
        <button className="btn btn--secondary" onClick={() => setComparing(true)}>Compare (C)</button>
        <Seal label="Freeze" variant="vermilion"
          disabled={acct.pii_masked} disabledReason="Requires MLRO authority"
          onAuthorize={() => post({ msg: `${acct.account_ref} frozen — audit ref printed to the register.`, tone: "success" })} />
        <Seal label="KYC review" variant="ink"
          onAuthorize={() => post({ msg: `KYC review opened for ${acct.account_ref}.`, tone: "info" })} />
      </footer>

      <Comparator open={comparing} subject={acct} onClose={() => setComparing(false)} />
    </div>
  );
}
