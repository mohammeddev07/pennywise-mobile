import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { tokens } from "@/shared/ui/theme/tokens";

export function RingProgress({
  size = 88,
  stroke = 10,
  progress,
  color,
}: {
  size?: number;
  stroke?: number;
  progress: number; // 0..1 (clamped)
  color: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const dash = c * (1 - p);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tokens.colors.stroke}
          strokeWidth={stroke}
          fill="none"
          opacity={0.55}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={dash}
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
    </View>
  );
}

export default RingProgress;
