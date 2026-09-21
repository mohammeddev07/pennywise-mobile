import { useEffect } from "react";
import { View, type DimensionValue, type ViewStyle } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";

type Props = {
  width?: DimensionValue;
  height: number;
  borderRadius?: number; // snapped to the token radii
  style?: ViewStyle;
};

/** Snaps any requested radius to the nearest token so a skeleton matches the surface it stands in for. */
function normalizeRadius(r?: number) {
  const allowed = [tokens.radii.sm, tokens.radii.md, tokens.radii.lg] as number[];
  if (!r) return tokens.radii.md;
  return allowed.reduce((best, curr) => (Math.abs(curr - r) < Math.abs(best - r) ? curr : best), allowed[1]);
}

export function Skeleton({ width = "100%", height, borderRadius = tokens.radii.md, style }: Props) {
  const o = useSharedValue(0.35);

  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 800 }), -1, true, undefined, ReduceMotion.System);
  }, [o]);

  const shimmer = useAnimatedStyle(() => ({ opacity: o.value }));

  const r = normalizeRadius(borderRadius);

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: r,
          backgroundColor: tokens.colors.surface,
          borderWidth: 1,
          borderColor: tokens.colors.stroke,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View style={[{ flex: 1, backgroundColor: tokens.colors.surfaceAlt }, shimmer]} />
    </View>
  );
}

export default Skeleton;
