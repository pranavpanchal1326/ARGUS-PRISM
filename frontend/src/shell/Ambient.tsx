/* Ambient behaviours (Part 6.4 M11 + Part 1.3 favicon + Appendix B).
   - The watermark surfaces after 90s idle and dissolves on first input.
   - The favicon is a live canvas rosette reflecting the worst open warmth.
   - `?` prints the keyboard sheet. */
import { useCallback, useEffect, useState } from "react";
import { Rosette } from "../canon/Rosette";
import { MASTER_PARAMS, rosettePath } from "../engine/rosette";

const IDLE_MS = 90_000;
const KEYS: [string, string][] = [
  ["Cmd/Ctrl+K · .", "The Index"], ["/", "focus search / filter"], ["?", "this sheet"],
  ["J / K", "next / previous slip"], ["A", "mark examined"], ["E", "escalate"],
  ["Shift+F", "false positive"], ["C", "comparator"], ["F", "feed the press"],
  ["Esc", "close drawer / clear"],
];

export function Ambient({ warmth }: { warmth: number }) {
  const [idle, setIdle] = useState(false);
  const [help, setHelp] = useState(false);

  /* Watermark idle surfacing */
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const reset = () => { setIdle(false); clearTimeout(t); t = setTimeout(() => setIdle(true), IDLE_MS); };
    const evs = ["pointermove", "keydown", "scroll", "pointerdown"] as const;
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, reset)); };
  }, []);

  /* `?` keyboard sheet */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "?") { e.preventDefault(); setHelp((h) => !h); }
      else if (e.key === "Escape") setHelp(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Live favicon rosette — redrawn at most on warmth change */
  const paint = useCallback((w: number) => {
    const cv = document.createElement("canvas"); cv.width = 32; cv.height = 32;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const d = rosettePath({ ...MASTER_PARAMS, warmth: w / 100 }, 14, 16, 16, 2, 120);
    ctx.strokeStyle = w >= 60 ? "#E33F1E" : "#1A1B18"; ctx.lineWidth = 1;
    ctx.stroke(new Path2D(d));
    const link = (document.querySelector("link[rel~='icon']") as HTMLLinkElement) ?? document.createElement("link");
    link.rel = "icon"; link.type = "image/png"; link.href = cv.toDataURL("image/png");
    if (!link.parentNode) document.head.appendChild(link);
  }, []);
  useEffect(() => { paint(warmth); }, [warmth, paint]);

  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <>
      {idle && (
        <div className={`watermark-layer${reduced ? "" : " watermark-layer--breathe"}`} aria-hidden>
          <Rosette params={MASTER_PARAMS} size={420} tier={3} ink="var(--ink)" />
        </div>
      )}
      {help && (
        <div className="help-scrim" onClick={() => setHelp(false)}>
          <div className="help-sheet" role="dialog" aria-label="Keyboard map" onClick={(e) => e.stopPropagation()}>
            <p className="v-display v-display--section">The Keyboard</p>
            <dl className="help-map">
              {KEYS.map(([k, v]) => (<div key={k} className="help-row"><dt className="mx">{k}</dt><dd>{v}</dd></div>))}
            </dl>
          </div>
        </div>
      )}
    </>
  );
}
