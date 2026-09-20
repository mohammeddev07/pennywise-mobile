import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";

/**
 * Counts a figure up to its value.
 *
 * The rule the design system sets: **count only on a data change**, never on
 * focus or re-render. A balance that re-counts every time the user comes back
 * to the tab reads as a glitch, not as polish - so the target is compared
 * against the last one and a repeat of the same number animates nothing.
 *
 * The first value that lands is shown as-is - counting up from 0 flashed a
 * false "$0.00" before the real balance. Only a later change (a save landing)
 * counts, and never under reduced motion.
 */
export function useCountUp(
  target: number | undefined,
  {
    changeDuration = 600,
    enabled = true,
  }: { changeDuration?: number; enabled?: boolean } = {}
) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(target ?? 0);
  const previous = useRef<number | undefined>(undefined);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (target === undefined) return;

    const from = previous.current;
    const isFirst = from === undefined;

    // Same number as last time: nothing changed, so nothing animates.
    if (!isFirst && from === target) return;

    previous.current = target;

    if (isFirst || !enabled || reduceMotion) {
      setValue(target);
      return;
    }

    const start = Date.now();
    const origin = from as number;
    const duration = changeDuration;

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      // easeOutExpo - fast off the line, settling gently onto the value.
      const eased = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(origin + (target - origin) * eased);

      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
        frame.current = null;
      }
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [changeDuration, enabled, reduceMotion, target]);

  return value;
}
