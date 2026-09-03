import React, { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";

/**
 * The success mark.
 *
 * One short scale-and-fade that settles and stops. Nothing here loops - a
 * confirmation that keeps moving reads as "still working" rather than "done".
 */
export function SuccessCheck({ size = 72 }: { size?: number }) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const markScale = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: tokens.motion.base });
    scale.value = withSequence(
      withTiming(1.04, { duration: tokens.motion.base }),
      withTiming(1, { duration: tokens.motion.fast })
    );
    markScale.value = withDelay(90, withTiming(1, { duration: tokens.motion.base }));
  }, [markScale, opacity, scale]);

  const ring = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const mark = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: markScale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tokens.colors.accent,
        },
        ring,
      ]}
    >
      <Animated.View style={mark}>
        <Ionicons name="checkmark" size={Math.round(size * 0.5)} color={tokens.colors.onAccent} />
      </Animated.View>
    </Animated.View>
  );
}

export default SuccessCheck;
