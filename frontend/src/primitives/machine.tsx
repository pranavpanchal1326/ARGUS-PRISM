/* MACHINE PRIMITIVES (Part 9.23) — the LAW III enforcement layer.
   The only sanctioned renderers for machine data. */
import { money, moneyShort, timestamp, since, date } from "../lib/format";

export function Num({ value, weight = 400 }: { value: number | string; weight?: 400 | 600 }) {
  return <span className="mx" style={weight === 600 ? { fontWeight: 600 } : undefined}>{value}</span>;
}

export function Money({ value, short = false }: { value: number; short?: boolean }) {
  return (
    <span className="mx" title={short ? money(value) : undefined} style={{ fontWeight: 600 }}>
      {short ? moneyShort(value) : money(value)}
    </span>
  );
}

/** Dateline / timestamp / relative. Relative only in live contexts; full on hover. */
export function When({ iso, mode = "stamp" }: { iso: string; mode?: "stamp" | "relative" | "date" }) {
  if (mode === "relative") return <span className="mx" title={timestamp(iso)}>{since(iso)}</span>;
  if (mode === "date") return <span className="mx">{date(iso)}</span>;
  return <span className="mx">{timestamp(iso)}</span>;
}

/** Masked reference — machine strings never ellipsize; middle patterns hold. */
export function Ref({ value }: { value: string }) {
  return <span className="mx">{value}</span>;
}
