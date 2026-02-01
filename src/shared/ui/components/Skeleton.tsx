import { useEffect } from "react";
import { View, type DimensionValue, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";

type Props = {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = "100%", height, borderRadius = 16, style }: Props) {
  const o = useSharedValue(0.45);

  useEffect(() => {
    o.value = withRepeat(withTiming(0.9, { duration: 700 }), -1, true);
  }, [o]);

  const shimmer = useAnimatedStyle(() => ({ opacity: o.value }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "rgba(255,255,255,0.06)",
          borderWidth: 1,
          borderColor: tokens.colors.stroke,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View style={[{ flex: 1, backgroundColor: "rgba(255,255,255,0.08)" }, shimmer]} />
    </View>
  );
}

export default Skeleton;
