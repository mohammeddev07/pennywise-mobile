import { useEffect, useRef, useState } from "react";

/**
 * Counts a figure up to its value.
 *
 * The rule the design system sets: **count only on a data change**, never on
 * focus or re-render. A balance that re-counts every time the user comes back
 * to the tab reads as a glitch, not as polish - so the target is compared
 * against the last one and a repeat of the same number animates nothing.
 *
 * Mount uses the long easeOutExpo; a later change (a save landing) uses the
 * shorter one, because the user already knows what they just did.
 */
export function useCountUp(
  target: number | undefined,
  {
    mountDuration = 900,
    changeDuration = 600,
    enabled = true,
  }: { mountDuration?: number; changeDuration?: number; enabled?: boolean } = {}
) {
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

    if (!enabled) {
      setValue(target);
      return;
    }

    const start = Date.now();
    const origin = isFirst ? 0 : (from as number);
    const duration = isFirst ? mountDuration : changeDuration;

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
  }, [changeDuration, enabled, mountDuration, target]);

  return value;
}
