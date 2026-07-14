/* Honest placeholder — a sheet not yet struck. Never fake-populated. */
import { Rosette } from "../canon/Rosette";
import { MASTER_PARAMS } from "../engine/rosette";
import { LEX } from "../lexicon/strings";

export function UnderConstruction({ title }: { title: string }) {
  return (
    <div>
      <h1 className="sheet-title">{title}</h1>
      <div className="void">
        <Rosette params={MASTER_PARAMS} size={96} tier={3} title="The Master Rosette" ink="var(--ink-faint)" />
        <p className="void__line">{LEX.underConstruction}</p>
        <p className="void__detail">
          The records are already kept in the register — the sheet to read them is at the press.
        </p>
      </div>
    </div>
  );
}
