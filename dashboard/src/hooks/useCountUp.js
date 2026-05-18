import { useState, useEffect, useRef } from 'react';

/**
 * useCountUp — counts from 0 to `end` when the attached element
 * enters the viewport (IntersectionObserver, threshold: 0.5).
 *
 * Uses requestAnimationFrame with ease-out-quart easing so the
 * count feels physical — fast at first, settling gently at the target.
 *
 * @param {number}  end          — target value
 * @param {number}  duration     — animation duration in ms (default 1800)
 * @param {boolean} startOnMount — if true, starts immediately without waiting for intersection
 * @returns {{ value: number, ref: React.RefObject }}
 */
function useCountUp(end, duration = 1800, startOnMount = false) {
  const [value, setValue]   = useState(0);
  const ref                 = useRef(null);
  const hasStarted          = useRef(false);

  useEffect(() => {
    function runAnimation() {
      if (hasStarted.current) return;
      hasStarted.current = true;

      const startTime = performance.now();
      /* ease-out-quart: fast start, smooth settle */
      const easing = t => 1 - Math.pow(1 - t, 4);

      function tick(now) {
        const elapsed = now - startTime;
        const t       = Math.min(elapsed / duration, 1);
        setValue(Math.round(easing(t) * end));
        if (t < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    }

    /* startOnMount: bypass IntersectionObserver */
    if (startOnMount) {
      runAnimation();
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          runAnimation();
          observer.unobserve(element); /* fire once */
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [end, duration, startOnMount]);

  return { value, ref };
}

export default useCountUp;
