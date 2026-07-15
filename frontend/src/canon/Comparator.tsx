/* THE COMPARATOR (9.12) — SPECIMEN vs SUBJECT. Two rosettes above a
   deviation ledger. Baseline is the cohort median drawn from real
   accounts of the same segment (Law 2 — no invented baselines). No
   verdict language; deviations are printed, judgment belongs elsewhere. */
import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { Rosette } from "./Rosette";
import { api, type Account, type AccountSummary } from "../api/client";
import { paramsFromScore } from "../engine/rosette";

interface Props { open: boolean; subject: Account | null; onClose: () => void; }

interface Baseline { n: number; medianWarmth: number; segment: string; }

export function Comparator({ open, subject, onClose }: Props) {
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !subject) return;
    setLoading(true); setBaseline(null);
    (async () => {
      try {
        const seg = subject.segment ?? "";
        const res = await api<{ data: AccountSummary[] }>(`/api/v1/accounts?query=${encodeURIComponent(seg)}&limit=50`);
        const cohort = res.data.filter((a) => a.id !== subject.id && (!seg || a.segment === seg));
        if (cohort.length === 0) { setBaseline(null); return; }
        const scores = cohort.map((a) => a.warmth_score).sort((a, b) => a - b);
        const median = scores[Math.floor(scores.length / 2)];
        setBaseline({ n: cohort.length, medianWarmth: median, segment: seg || "all accounts" });
      } catch { setBaseline(null); }
      finally { setLoading(false); }
    })();
  }, [open, subject]);

  return (
    <Drawer open={open} title="Comparator" refLabel="SPECIMEN vs SUBJECT" onClose={onClose}>
      {subject && (
        <div className="comparator">
          <div className="comparator__pair">
            <figure className="comparator__fig">
              <Rosette size={96} tier={3} draw params={baseline
                ? paramsFromScore(baseline.medianWarmth, [], "specimen")
                : paramsFromScore(0, [], "specimen")} ink="var(--ink-mut)" />
              <figcaption className="v-label">SPECIMEN</figcaption>
              <span className="mx comparator__cohort">
                {loading ? "…" : baseline ? `${baseline.segment}, n=${baseline.n}` : "no cohort"}
              </span>
            </figure>
            <figure className="comparator__fig">
              <Rosette size={96} tier={3} draw
                params={paramsFromScore(subject.warmth_score, (subject.top_signals ?? []).map((s) => s.contribution), subject.account_ref)} />
              <figcaption className="v-label">SUBJECT</figcaption>
              <span className="mx comparator__cohort">{subject.account_ref}</span>
            </figure>
          </div>

          <div className="comparator__ledger">
            <div className="comparator__row comparator__row--head">
              <span>Metric</span><span className="comparator__r">Specimen</span>
              <span className="comparator__r">Subject</span><span className="comparator__r">Deviation</span>
            </div>
            {baseline ? (
              <Deviation label="Warmth" specimen={baseline.medianWarmth} subject={subject.warmth_score} />
            ) : (
              <p className="comparator__none">No cohort specimen available for this segment.</p>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Deviation({ label, specimen, subject }: { label: string; specimen: number; subject: number }) {
  const dev = subject - specimen;
  const pct = specimen ? (dev / specimen) * 100 : 0;
  return (
    <div className="comparator__row">
      <span>{label}</span>
      <span className="mx comparator__r num">{Math.round(specimen)}</span>
      <span className="mx comparator__r num">{Math.round(subject)}</span>
      <span className="comparator__r comparator__dev">
        <span className="comparator__hatch" style={{ width: `${Math.min(100, Math.abs(pct))}%` }} />
        <span className="mx num">{dev >= 0 ? "+" : ""}{Math.round(dev)}</span>
      </span>
    </div>
  );
}
