/* SHEET 08 · THE PRINTING ROOM (Part 10) — the screen that killed V2.
   Renders ONLY job state from the contract; no local secrets, no crypto
   theatre. The press-line mirrors the backend states 1:1; regeneration
   VISIBLY mints a new impression. The theatre and the truth are one object. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiProblem, type StrJob, type PackageSummary } from "../api/client";
import { Overprint } from "../canon/Overprint";
import { Seal } from "../canon/Seal";
import { useNotices } from "../canon/Notices";
import { timestamp } from "../lib/format";
import "./printing.css";

const STAGES: StrJob["status"][] = ["ASSEMBLING", "SIGNING", "SEALED"];
const ARTIFACTS = [
  { key: "FIU_STR_XML", label: "FIU-IND XML" },
  { key: "CBI_PDF", label: "CBI PDF" },
  { key: "RBI_JSON", label: "RBI REPORT" },
];

export function PrintingRoom() {
  const { caseId = "" } = useParams();
  const [job, setJob] = useState<StrJob | null>(null);
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [tab, setTab] = useState(0);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const { post } = useNotices();

  const loadPackages = useCallback(async () => {
    try {
      const res = await api<{ data: PackageSummary[] }>(`/api/v1/autostr/${caseId}/packages`);
      setPackages(res.data);
    } catch { /* none yet */ }
  }, [caseId]);
  useEffect(() => { void loadPackages(); }, [loadPackages]);

  /* Rehydrate a running job from its endpoint (refresh-safe, Part 10). */
  const trackJob = useCallback((jobId: string) => {
    if (poll.current) clearInterval(poll.current);
    poll.current = setInterval(async () => {
      try {
        const res = await api<{ data: StrJob }>(`/api/v1/autostr/jobs/${jobId}`);
        setJob(res.data);
        if (res.data.status === "SEALED" || res.data.status === "FAILED") {
          if (poll.current) clearInterval(poll.current);
          void loadPackages();
          if (res.data.status === "SEALED") post({ msg: "Package sealed. The fingerprint is printed.", tone: "success" });
          else post({ msg: `MISPRINT — the impression failed at ${res.data.status}.`, tone: "error" });
        }
      } catch { /* keep polling */ }
    }, 800);
  }, [loadPackages, post]);

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  async function strike() {
    try {
      const res = await api<{ data: StrJob }>(`/api/v1/autostr/${caseId}/generate`, { method: "POST" });
      setJob(res.data);
      trackJob(res.data.id);
    } catch (err) {
      post({ msg: err instanceof ApiProblem ? err.title : "The press jammed.", tone: "error" });
    }
  }

  const running = job && job.status !== "SEALED" && job.status !== "FAILED";
  const stageIdx = job ? STAGES.indexOf(job.status === "FAILED" ? "SIGNING" : job.status) : -1;

  return (
    <div className="sheet">
      <div className="margin">
        <h1 className="margin__title">The Printing Room</h1>
        <p className="mx" style={{ fontSize: "var(--text-12)", color: "var(--ink-mut)" }}>CASE {caseId || "—"}</p>
        <div className="pkg-history">
          <p className="v-label" style={{ marginTop: "var(--s-6)", display: "block" }}>Impression history</p>
          {packages.length === 0 ? <p className="void__detail">No impressions struck.</p> : (
            <ul className="pkg-list">
              {packages.map((p, i) => (
                <li key={p.id} className="pkg-stub">
                  <span className="mx pkg-stub__no">Nº {i + 1}</span>
                  <span className="pkg-stub__name">{p.filename}</span>
                  <span className="mx pkg-stub__fp" title="Document fingerprint (last 8 — not key material)">{p.fingerprint}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        {/* The press bed — artifact preview tabs */}
        <div className="press-bed card">
          <div className="press-bed__tabs">
            {ARTIFACTS.map((a, i) => (
              <button key={a.key} className={`press-tab${tab === i ? " press-tab--active" : ""}`} onClick={() => setTab(i)}>{a.label}</button>
            ))}
          </div>
          <div className={`press-bed__doc${running ? " press-bed__doc--assembling" : ""}`}>
            {/* The border scribes as the package assembles; microtext fills
                it as it signs — the visual of signing without a key on the wire. */}
            {(running || job?.status === "SEALED") && (
              <svg className="doc-border" aria-hidden viewBox="0 0 400 260" preserveAspectRatio="none">
                <rect x="3" y="3" width="394" height="254" fill="none"
                  stroke={job?.status === "SIGNING" || job?.status === "SEALED" ? "var(--verified)" : "var(--reserve)"}
                  strokeWidth="1" pathLength={1}
                  className={job?.status === "SEALED" ? "doc-border__rect doc-border__rect--done" : "doc-border__rect"} />
              </svg>
            )}
            <div className="doc-letterhead">
              <span className="v-label">UNION BANK OF INDIA · {ARTIFACTS[tab].label}</span>
              <span className="mx" style={{ fontSize: "var(--text-11)", color: "var(--ink-faint)" }}>CASE {caseId}</span>
            </div>
            {job?.status === "SEALED" ? (
              <div className="doc-sealed">
                <Overprint tone="verified" size="body" land>SEALED</Overprint>
                {packages[0] && <p className="mx doc-fp">DOCUMENT FINGERPRINT · {packages[0].fingerprint}</p>}
              </div>
            ) : running ? (
              <p className="mx doc-status">{job?.status}…</p>
            ) : (
              <p className="void__detail">The press bed is clear. Strike a package to begin.</p>
            )}
          </div>
        </div>

        {/* The press line — mirrors backend state 1:1 */}
        {job && (
          <ol className="strike-line">
            {STAGES.map((s, i) => (
              <li key={s} className={`strike-station${i <= stageIdx ? " strike-station--done" : ""}${i === stageIdx && running ? " strike-station--active" : ""}`}>
                <span className="strike-station__pin" />
                <span className="v-label">{s}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="printing-actions">
          <Seal label={packages.length ? "Regenerate" : "Strike the package"} variant="ink"
            disabled={!!running} disabledReason="The press is engaged" onAuthorize={strike} />
          {packages.length > 0 && (
            <Seal label="Countersign & submit" variant="reserve"
              onAuthorize={async () => {
                try {
                  await api(`/api/v1/autostr/packages/${packages[0].id}/approve`, { method: "POST" });
                  post({ msg: "SUBMITTED — countersignature drawn.", tone: "success" });
                  void loadPackages();
                } catch (err) { post({ msg: err instanceof ApiProblem ? err.title : "Returned.", tone: "error" }); }
              }} />
          )}
        </div>
        {packages.length > 1 && (
          <p className="mx impression-note">IMPRESSION Nº {packages.length} — a new strike, a new fingerprint.</p>
        )}
      </div>
    </div>
  );
}

void timestamp;
