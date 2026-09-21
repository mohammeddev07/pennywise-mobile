import { useCallback, useRef } from "react";
import type { LayoutChangeEvent, ScrollView } from "react-native";

/**
 * Scroll a form to its first invalid field. Mark each direct child of the ScrollView's content that
 * can show an error with `mark(key)`, then call `scrollToError(key)` when validation fails; a field
 * nested one level deeper passes both keys and their offsets add up.
 */
export function useScrollToError() {
  const ref = useRef<ScrollView>(null);
  const ys = useRef<Record<string, number>>({});
  const mark = useCallback((key: string) => (e: LayoutChangeEvent) => {
    ys.current[key] = e.nativeEvent.layout.y;
  }, []);
  const scrollToError = useCallback((...keys: string[]) => {
    const y = keys.reduce((sum, k) => sum + (ys.current[k] ?? 0), 0);
    ref.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
  }, []);
  return { ref, mark, scrollToError };
}
