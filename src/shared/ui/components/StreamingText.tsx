import { useEffect, useMemo, useState } from "react";
import { Text, type TextProps } from "react-native";

type Props = TextProps & {
  text: string;
  speedMs?: number;
  loop?: boolean;

  // Contract: prevent layout jump while streaming
  reserveLines?: number; // default 1
  reserveMinHeight?: number; // overrides reserveLines
  active?: boolean; // default true
};

function getLineHeightFromStyle(style: any): number | undefined {
  if (!style) return undefined;

  if (Array.isArray(style)) {
    for (const s of style) {
      const lh = getLineHeightFromStyle(s);
      if (typeof lh === "number") return lh;
    }
    return undefined;
  }

  if (typeof style === "object" && typeof style.lineHeight === "number") return style.lineHeight;
  if (typeof style === "object" && typeof style.fontSize === "number") return Math.round(style.fontSize * 1.35);

  return undefined;
}

export function StreamingText({
  text,
  speedMs = 22,
  loop = false,
  reserveLines = 1,
  reserveMinHeight,
  active = true,
  style,
  ...rest
}: Props) {
  const [n, setN] = useState(0);
  const safe = useMemo(() => (text ?? "").toString(), [text]);

  useEffect(() => {
    if (!active) {
      setN(safe.length);
      return;
    }

    let i = 0;
    setN(0);

    const id = setInterval(() => {
      i += 1;

      if (i > safe.length) {
        if (loop) {
          i = 0;
          setN(0);
          return;
        }
        clearInterval(id);
        setN(safe.length);
        return;
      }

      setN(i);
    }, speedMs);

    return () => clearInterval(id);
  }, [safe, speedMs, loop, active]);

  const resolvedLineHeight = getLineHeightFromStyle(style) ?? 22;
  const minHeight = reserveMinHeight ?? resolvedLineHeight * Math.max(1, reserveLines);

  return (
    <Text {...rest} style={[{ minHeight }, style]}>
      {safe.slice(0, n)}
    </Text>
  );
}

export default StreamingText;
