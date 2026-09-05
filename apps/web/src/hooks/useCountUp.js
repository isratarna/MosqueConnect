import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Decelerating curve, matched to the cubic-bezier(0.22, 1, 0.36, 1) the rest of
// the motion system eases with, so a counter settles on the same beat as the
// element it sits in.
const easeOut = (t) => 1 - (1 - t) ** 3;

/*
 * Animates a whole number from its previous value up to `target`.
 *
 * The hero count changes whenever discovery re-runs, so this animates between
 * successive values rather than always from zero: the first reading counts up
 * from 0, and a later correction (12 -> 14) travels only the difference.
 * Returns `target` unchanged when the reader has asked for reduced motion.
 */
export default function useCountUp(target, { duration = 900 } = {}) {
  const safeTarget = Number.isFinite(target) ? Math.round(target) : 0;
  const [displayed, setDisplayed] = useState(safeTarget);
  const fromRef = useRef(safeTarget);

  useEffect(() => {
    if (prefersReducedMotion()) {
      fromRef.current = safeTarget;
      setDisplayed(safeTarget);
      return undefined;
    }

    const from = fromRef.current;
    if (from === safeTarget) return undefined;

    let frame = 0;
    const started = performance.now();

    const step = (now) => {
      const progress = Math.min((now - started) / duration, 1);
      const value = Math.round(from + (safeTarget - from) * easeOut(progress));
      setDisplayed(value);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        fromRef.current = safeTarget;
      }
    };

    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      // Whatever number was on screen is where the next run starts, so an
      // interrupted count never jumps backwards before counting again.
      setDisplayed((current) => {
        fromRef.current = current;
        return current;
      });
    };
  }, [safeTarget, duration]);

  return displayed;
}
