/* SHEET 03 · THE DOCKET (Part 10) — case lifecycle. Index (ledger of
   docket entries) → case sheet (two-page spread): facts left, the press
   line + accumulation gauge right. Transitions are Seals; notes are
   append-only, matching audit reality. */
import { useCallback, useEffect, useState } from "react";
import { api, ApiProblem, WatchInterrupted, type Case, type CaseStatus, type CaseActivity } from "../api/client";
import { Overprint } from "../canon/Overprint";
import { Seal } from "../canon/Seal";
import { useNotices } from "../canon/Notices";
import { date, timestamp } from "../lib/format";
import "./docket.css";

const STATE_LABEL: Record<CaseStatus, string> = {
  OPEN: "STRUCK",
  UNDER_REVIEW: "EXAMINATION",
  PENDING_MLRO: "AWAITING MLRO",
  CLOSED_CONFIRMED_MULE: "SEALED",
  CLOSED_FALSE_POSITIVE: "RETURNED",
};
const PRESS_LINE: CaseStatus[] = ["OPEN", "UNDER_REVIEW", "PENDING_MLRO", "CLOSED_CONFIRMED_MULE"];

export function Docket() {
  const [cases, setCases] = useState<Case[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api<{ data: Case[] }>("/api/v1/cases");
      setCases(res.data);
    } catch (err) {
      setCases(null);
      setError(err instanceof WatchInterrupted ? err.message
        : err instanceof ApiProblem ? `${err.title}${err.detail ? ` — ${err.detail}` : ""}`
        : "The docket could not be read.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (openId) return <CaseSheet id={openId} onClose={() => { setOpenId(null); void load(); }} />;

  return (
    <div className="sheet">
      <div className="margin">
        <h1 className="margin__title">The Docket</h1>
        {cases && <p className="margin__note">{cases.length} case{cases.length === 1 ? "" : "s"} on the docket.</p>}
      </div>
      <div>
        {error ? (
          <div className="misprint">
            <div className="misprint__stamp"><Overprint tone="vermilion">MISPRINT</Overprint></div>
            <p className="misprint__detail">{error}</p>
            <button className="btn btn--secondary" onClick={() => void load()}>Re-run the sheet</button>
          </div>
        ) : cases === null ? (
          <div className="docket-list">{[0, 1, 2, 3].map((i) => <div key={i} className="docket-row"><span className="unprinted" style={{ width: "40%" }} /></div>)}</div>
        ) : cases.length === 0 ? (
          <div className="void"><p className="void__line">The docket is clear.</p></div>
        ) : (
          <table className="ledger docket-ledger">
            <thead><tr><th>Ref</th><th>Title</th><th>State</th><th>Opened by</th><th className="ledger__r">Alerts</th></tr></thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="docket-row" onClick={() => setOpenId(c.id)}>
                  <td className="mx">{c.id}</td>
                  <td>{c.title}</td>
                  <td><Overprint size="micro" tone={c.status.startsWith("CLOSED") ? "verified" : "ink"}>{STATE_LABEL[c.status]}</Overprint></td>
                  <td className="mx">{c.created_by}</td>
                  <td className="mx ledger__r num">{c.alert_ids?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CaseSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const [c, setCase] = useState<Case | null>(null);
  const [activity, setActivity] = useState<CaseActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const { post } = useNotices();

  const load = useCallback(async () => {
    try {
      const res = await api<{ data: Case }>(`/api/v1/cases/${id}`);
      setCase(res.data);
    } catch (err) { setError(err instanceof ApiProblem ? err.title : "The case could not be printed."); }
    try {
      const act = await api<{ data: CaseActivity[] }>(`/api/v1/cases/${id}/activity`);
      setActivity(act.data);
    } catch { /* activity optional */ }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function addNote() {
    if (note.trim().length < 3) return;
    try {
      await api(`/api/v1/cases/${id}/notes`, { method: "POST", body: JSON.stringify({ body: note.trim() }) });
      setNote("");
      post({ msg: "Note entered into the register.", tone: "success" });
      void load();
    } catch (err) {
      post({ msg: err instanceof ApiProblem ? err.title : "The note was returned.", tone: "error" });
    }
  }

  async function transition(to: CaseStatus) {
    try {
      await api(`/api/v1/cases/${id}`, { method: "PATCH", body: JSON.stringify({ status: to }) });
      post({ msg: `Case ${id} → ${STATE_LABEL[to]}. Audit ref printed.`, tone: "success" });
      void load();
    } catch (err) {
      post({ msg: err instanceof ApiProblem ? err.title : "The transition was returned.", tone: "error" });
    }
  }

  if (error) return (
    <div><button className="btn btn--quiet" onClick={onClose}>← Return to the docket</button>
      <div className="misprint"><div className="misprint__stamp"><Overprint tone="vermilion">MISPRINT</Overprint></div><p className="misprint__detail">{error}</p></div></div>
  );
  if (!c) return <div className="void"><span className="unprinted" style={{ width: 220 }} /></div>;

  const stationIdx = PRESS_LINE.indexOf(c.status.startsWith("CLOSED") ? "CLOSED_CONFIRMED_MULE" : c.status);
  const tally = [
    { n: c.alert_ids?.length ?? 0, k: "ALERTS" },
    { n: c.account_ids?.length ?? 0, k: "ACCOUNTS" },
    { n: c.evidence?.length ?? 0, k: "EXHIBITS" },
    { n: c.notes?.length ?? 0, k: "NOTES" },
  ];

  return (
    <div className="case-sheet">
      <button className="btn btn--quiet" onClick={onClose}>← Return to the docket</button>
      <header className="case-head">
        <div>
          <span className="mx case-head__ref">{c.id}</span>
          <h1 className="case-head__title v-display v-display--title">{c.title}</h1>
        </div>
        <Overprint size="body" tone={c.status.startsWith("CLOSED") ? "verified" : "ink"} land>{STATE_LABEL[c.status]}</Overprint>
      </header>

      <div className="case-spread">
        {/* LEFT PAGE — facts */}
        <div className="case-page">
          <section className="case-block">
            <p className="v-label">Linked accounts</p>
            {c.account_ids.length === 0 ? <p className="void__detail">None attached.</p> :
              <ul className="stub-list">{c.account_ids.map((a) => <li key={a} className="mx stub">{a}</li>)}</ul>}
          </section>
          <section className="case-block">
            <p className="v-label">The notes register</p>
            <div className="notes">
              {(c.notes ?? []).map((n) => (
                <div key={n.id} className="note-entry">
                  <span className="mx note-entry__meta">{timestamp(n.created_at)} · {n.author}</span>
                  <p className="note-entry__body">{n.body}</p>
                </div>
              ))}
            </div>
            <div className="note-composer">
              <textarea className="field__input" rows={2} value={note} placeholder="Enter a note…"
                onChange={(e) => setNote(e.target.value)} />
              <button className="btn btn--secondary" onClick={addNote}>Enter</button>
            </div>
          </section>
        </div>

        {/* RIGHT PAGE — state */}
        <div className="case-page">
          <section className="case-block">
            <p className="v-label">The press line</p>
            <ol className="press-line">
              {PRESS_LINE.map((s, i) => (
                <li key={s} className={`press-station${i <= stationIdx ? " press-station--done" : ""}${i === stationIdx ? " press-station--here" : ""}`}>
                  <span className="press-station__pin" />
                  <span className="press-station__label v-label">{STATE_LABEL[s]}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="case-block">
            <p className="v-label">Accumulation</p>
            <div className="gauge" style={{ ["--weight" as string]: String(tally.reduce((a, t) => a + t.n, 0)) }}>
              {tally.map((t) => <span key={t.k} className="gauge__item"><span className="mx num">{t.n}</span> {t.k}</span>)}
            </div>
          </section>

          <section className="case-block">
            <p className="v-label">Transitions</p>
            <div className="case-actions">
              {c.status === "OPEN" && <Seal label="Begin examination" variant="ink" onAuthorize={() => transition("UNDER_REVIEW")} />}
              {c.status === "UNDER_REVIEW" && <Seal label="Escalate to MLRO" variant="reserve" onAuthorize={() => transition("PENDING_MLRO")} />}
              {c.status === "PENDING_MLRO" && <>
                <Seal label="Seal — confirmed mule" variant="vermilion" onAuthorize={() => transition("CLOSED_CONFIRMED_MULE")} />
                <Seal label="Return — false positive" variant="ink" onAuthorize={() => transition("CLOSED_FALSE_POSITIVE")} />
              </>}
              {c.status.startsWith("CLOSED") && <p className="void__detail">This case is closed. Strike a counter-entry to reopen.</p>}
            </div>
          </section>

          {activity.length > 0 && (
            <section className="case-block">
              <p className="v-label">Provenance</p>
              <ul className="provenance">
                {activity.map((a, i) => (
                  <li key={i} className="mx provenance__row">
                    {timestamp(a.at)} · {a.actor} · {a.action}
                    {a.to_status && ` → ${a.to_status}`}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
      <p className="mx case-foot">Opened {date(c.created_at)} by {c.created_by}</p>
    </div>
  );
}
