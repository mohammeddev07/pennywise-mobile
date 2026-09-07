/**
 * Alpha helpers.
 *
 * React Native accepts 8-digit hex in plain styles, but Reanimated's
 * `interpolateColor` is only reliable with `rgba()`, so anything that gets
 * animated must go through `withAlpha`.
 */
export function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value.slice(0, 6);

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);

  if (![r, g, b].every(Number.isFinite)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
