/* Formatting — Machine-voice conventions. Indian formats are data
   correctness (Union Bank), the system itself is currency-agnostic. */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
});

export function money(v: number): string {
  return inr.format(v); // en-IN gives lakh/crore grouping: ₹12,45,000
}

/** Short form for cards: ≥1 crore → ₹4.2 Cr, ≥1 lakh → ₹7.3 L */
export function moneyShort(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(1)} Cr`;
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
  return inr.format(v);
}

const IST = "Asia/Kolkata";

/** Audit-grade: 13-07-2026 19:42:11 IST */
export function timestamp(iso: string): string {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("day")}-${g("month")}-${g("year")} ${g("hour")}:${g("minute")}:${g("second")} IST`;
}

/** Human date: 13 Jul 2026 */
export function date(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST, day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(iso));
}

/** Live-feed relative time — always paired with full timestamp on hover. */
export function since(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** SLA countdown: remaining time until deadline, and burn ratio 0..1 */
export function slaState(deadlineIso: string, firstSignalIso: string) {
  const now = Date.now();
  const deadline = new Date(deadlineIso).getTime();
  const start = new Date(firstSignalIso).getTime();
  const remaining = deadline - now;
  const total = Math.max(1, deadline - start);
  const burn = Math.min(1, Math.max(0, (now - start) / total));
  const h = Math.floor(Math.abs(remaining) / 3.6e6);
  const m = Math.floor((Math.abs(remaining) % 3.6e6) / 6e4);
  const label = remaining <= 0 ? `OVERDUE ${h}h ${m}m` : `${h}h ${m}m`;
  return { remaining, burn, label, overdue: remaining <= 0 };
}
