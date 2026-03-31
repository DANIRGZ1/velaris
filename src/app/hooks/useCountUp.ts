import { useEffect, useRef, useState } from "react";

/**
 * Animates a numeric value from 0 to `end` with an ease-out cubic curve.
 * @param end     Target number to count up to
 * @param duration Animation duration in ms (default 900)
 * @param delay   Delay before animation starts in ms (default 0)
 */
export function useCountUp(end: number, duration = 900, delay = 0): number {
  const [current, setCurrent] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (end === 0) { setCurrent(0); return; }

    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp + delay;
      const elapsed = Math.max(0, timestamp - startTime);
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - (1 - progress) ** 3;
      setCurrent(Math.round(eased * end));
      if (progress < 1) {
        raf.current = requestAnimationFrame(step);
      }
    };

    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current !== null) cancelAnimationFrame(raf.current); };
  }, [end, duration, delay]);

  return current;
}
