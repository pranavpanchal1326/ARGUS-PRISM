/* THE WORKSHEET (9.4) — evidence trail with counterweight. Indications
   and contra-indications, both columns always printed. The credibility
   engine: absence of exoneration is itself information. */
import { LEX } from "../lexicon/strings";
import type { Schemas } from "../api/client";

type Signal = Schemas["ShapSignal"];

export function Worksheet({ signals }: { signals: Signal[] }) {
  const indications = signals.filter((s) => s.contribution >= 0);
  const contra = signals.filter((s) => s.contribution < 0);
  const maxAbs = Math.max(1, ...signals.map((s) => Math.abs(s.contribution)));

  return (
    <div className="worksheet">
      <p className="v-label" style={{ marginBottom: "var(--s-3)" }}>{LEX.basisOfExamination}</p>
      <div className="worksheet__cols">
        <div className="worksheet__col">
          <h4>{LEX.indications}</h4>
          {indications.length === 0
            ? <p className="worksheet__none">{LEX.noneRecorded}</p>
            : indications.map((s) => <Line key={s.code} s={s} maxAbs={maxAbs} />)}
        </div>
        <div className="worksheet__col">
          <h4>{LEX.contraIndications}</h4>
          {contra.length === 0
            ? <p className="worksheet__none">{LEX.noneRecorded}</p>
            : contra.map((s) => <Line key={s.code} s={s} maxAbs={maxAbs} />)}
        </div>
      </div>
    </div>
  );
}

function Line({ s, maxAbs }: { s: Signal; maxAbs: number }) {
  return (
    <div className="worksheet__line">
      <span className="worksheet__code">{s.code}</span>
      <span className="worksheet__finding">{s.label}</span>
      <span className="worksheet__hatch" style={{ width: `${Math.abs(s.contribution) / maxAbs * 100}%` }} />
    </div>
  );
}
