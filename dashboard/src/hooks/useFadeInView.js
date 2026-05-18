import { useEffect, useRef, useState } from 'react';

/**
 * useFadeInView — returns a ref and a boolean `isVisible`.
 * Attach ref to a DOM element; isVisible becomes true once
 * the element enters the viewport (uses IntersectionObserver).
 */
export default function useFadeInView(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(el); } },
      { threshold: 0.12, rootMargin: '-20px', ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { ref, isVisible };
}
