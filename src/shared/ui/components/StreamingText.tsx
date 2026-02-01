import { useEffect, useMemo, useState } from "react";
import { Text, type TextProps } from "react-native";

type Props = TextProps & {
  text: string;
  speedMs?: number;
  loop?: boolean;
};

export function StreamingText({ text, speedMs = 22, loop = false, ...rest }: Props) {
  const [n, setN] = useState(0);

  const safe = useMemo(() => (text ?? "").toString(), [text]);

  useEffect(() => {
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
  }, [safe, speedMs, loop]);

  return <Text {...rest}>{safe.slice(0, n)}</Text>;
}

export default StreamingText;
