import { type ReactNode } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";

type Props = {
  label?: string;
  disabled?: boolean;
  onSubmit: () => void;
  thresholdPx?: number;
  minVelocityY?: number;
  children: ReactNode;
};

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, v));
}

export function SwipeUpToSubmit({
  label = "Swipe up to submit",
  disabled = false,
  onSubmit,
  thresholdPx = 64,
  minVelocityY = -800,
  children,
}: Props) {
  const dragY = useSharedValue(0);

  const onTriggered = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSubmit();
  };

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(8)
    .activeOffsetX([-16, 16])
    .activeOffsetY([-8, 9999])
    .onUpdate((e) => {
      if (disabled) return;
      dragY.value = clamp(e.translationY, -80, 0);
    })
    .onEnd((e) => {
      if (disabled) {
        dragY.value = withTiming(0, { duration: 120 });
        return;
      }

      const shouldSubmit = e.translationY <= -thresholdPx || e.velocityY <= minVelocityY;
      if (shouldSubmit) {
        runOnJS(onTriggered)();
      }

      dragY.value = withTiming(0, { duration: 140 });
    })
    .onFinalize(() => {
      dragY.value = withTiming(0, { duration: 140 });
    });

  const handleStyle = useAnimatedStyle(() => {
    const progress = interpolate(Math.abs(dragY.value), [0, thresholdPx], [0, 1]);
    return {
      transform: [{ translateY: dragY.value * 0.18 }],
      opacity: disabled ? 0.4 : 1 - progress * 0.08,
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    const progress = interpolate(Math.abs(dragY.value), [0, thresholdPx], [0, 1]);
    return {
      transform: [{ scale: 1 + progress * 0.006 }],
      opacity: 1 - progress * 0.04,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View>
        <Animated.View
          className="mb-3 min-h-12 flex-row items-center justify-center rounded-lg border px-4"
          style={[
            {
              backgroundColor: disabled ? tokens.colors.surface : tokens.colors.accent,
              borderColor: disabled ? tokens.colors.stroke : tokens.colors.accentPressed,
            },
            handleStyle,
          ]}
        >
          <Ionicons name="chevron-up" size={16} color={disabled ? tokens.colors.muted : tokens.colors.black} />
          <AppText
            variant="sm"
            className="ml-1"
            style={{
              color: disabled ? tokens.colors.muted : tokens.colors.black,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            {label}
          </AppText>
        </Animated.View>

        <Animated.View style={contentStyle}>{children}</Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export default SwipeUpToSubmit;
