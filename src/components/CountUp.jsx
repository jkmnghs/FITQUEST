import React, { useState, useEffect, useRef } from 'react';

/**
 * Animated number count-up component.
 * Props: value (number), duration (ms, default 400), decimals (default 0),
 *        from (number, optional) — count up from this on mount instead of
 *        starting at `value`, e.g. from={0} so a stat climbs as its tab opens.
 */
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function CountUp({ value, duration = 400, decimals = 0, from, format }) {
  const start = from != null && !reducedMotion() ? from : value;
  const [display, setDisplay] = useState(start);
  // prevRef is the number currently on screen. It only advances as frames
  // render, so an effect cancelled mid-count (StrictMode's double-invoke, or a
  // new value arriving) resumes from where the display actually is.
  const prevRef = useRef(start);
  const rafRef = useRef(null);

  useEffect(() => {
    if (value === prevRef.current) return;
    const from = prevRef.current;
    const to = value;

    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      prevRef.current = progress < 1 ? current : to;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const n = decimals > 0 ? Number(display.toFixed(decimals)) : Math.round(display);
  if (format) return <>{format(n)}</>;
  return <>{decimals > 0 ? display.toFixed(decimals) : n}</>;
}
