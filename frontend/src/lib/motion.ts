/* Motion utilities — count-up for denomination numerals, respecting
   prefers-reduced-motion (snaps instantly). */
import { useEffect, useRef, useState } from "react";

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Ease-out count from previous value to `value` over `ms`. */
export function useCountUp(value: number, ms = 600): number {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (reduced() || from.current === value || document.hidden) {
      setDisplay(value); from.current = value; return;
    }
    const start = performance.now();
    const a = from.current, b = value;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(a + (b - a) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf.current = requestAnimationFrame(tick);
    // Safety net: rAF is throttled in background tabs — guarantee the final
    // value lands regardless, so the display never freezes on a stale number.
    const safety = setTimeout(() => { setDisplay(b); from.current = b; cancelAnimationFrame(raf.current); }, ms + 80);
    return () => { cancelAnimationFrame(raf.current); clearTimeout(safety); };
  }, [value, ms]);

  return display;
}
