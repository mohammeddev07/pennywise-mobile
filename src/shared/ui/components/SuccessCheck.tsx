import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import { withAlpha } from "@/shared/ui/theme/color";
import { Icon } from "./Icon";

/**
 * The success mark.
 *
 * Two beats and then stillness: a ring bursts outward and fades, and the disc
 * springs in behind it carrying the check. Nothing loops - a confirmation that
 * keeps moving reads as "still working" rather than "done" - and the whole
 * thing is over inside the success budget.
 *
 * The bloom is deliberately restrained. This is the only screen in the product
 * where a large glow is allowed at all, and even here it stays well under the
 * halo the first pass used, so the check reads as confirmation rather than as
 * a light source.
 */
export function SuccessCheck({ size = 72 }: { size?: number }) {
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0);
  const discScale = useSharedValue(0.4);
  const discOpacity = useSharedValue(0);
  const markScale = useSharedValue(0.4);

  useEffect(() => {
    // T0: the ring bursts out and dissolves.
    ringOpacity.value = withTiming(0.55, { duration: 90 });
    ringScale.value = withTiming(1.7, { duration: tokens.motion.ring });
    ringOpacity.value = withDelay(90, withTiming(0, { duration: tokens.motion.ring - 90 }));

    // T+80: the disc springs in behind it, carrying the check.
    discOpacity.value = withDelay(80, withTiming(1, { duration: tokens.motion.fast }));
    discScale.value = withDelay(80, withSpring(1, tokens.spring.bouncy));
    markScale.value = withDelay(170, withSpring(1, tokens.spring.snappy));
  }, [discOpacity, discScale, markScale, ringOpacity, ringScale]);

  const ring = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const disc = useAnimatedStyle(() => ({
    opacity: discOpacity.value,
    transform: [{ scale: discScale.value }],
  }));

  const mark = useAnimatedStyle(() => ({ transform: [{ scale: markScale.value }] }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: withAlpha(tokens.colors.success, 0.7),
          },
          ring,
        ]}
      />

      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: tokens.colors.success,
            ...tokens.glow.success,
          },
          disc,
        ]}
      >
        <Animated.View style={mark}>
          <Icon
            name="checkmark"
            size={Math.round(size * 0.5)}
            color={tokens.colors.onAccent}
            strokeWidth={3}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export default SuccessCheck;
