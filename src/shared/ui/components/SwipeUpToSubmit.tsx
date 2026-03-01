import { type ReactNode, useRef } from "react";
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
  variant?: "hint" | "panel";
  panelSafeBottom?: number;
  children?: ReactNode;
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
  variant = "hint",
  panelSafeBottom = 0,
  children,
}: Props) {
  const dragY = useSharedValue(0);
  const triggerLockRef = useRef(false);

  const onTriggered = () => {
    if (disabled) return;
    if (triggerLockRef.current) return;
    triggerLockRef.current = true;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSubmit();

    setTimeout(() => {
      triggerLockRef.current = false;
    }, 260);
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
      transform: [{ translateY: dragY.value * 0.15 }],
      opacity: disabled ? 0.4 : 1 - progress * 0.06,
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    const progress = interpolate(Math.abs(dragY.value), [0, thresholdPx], [0, 1]);
    return {
      transform: [{ scale: 1 + progress * 0.006 }],
      opacity: disabled ? 0.4 : 1 - progress * 0.04,
    };
  });

  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .maxDuration(220)
    .onEnd((_event, success) => {
      if (!success) return;
      runOnJS(onTriggered)();
    });

  const composed = Gesture.Simultaneous(gesture, tapGesture);

  return (
    <GestureDetector gesture={composed}>
      <Animated.View>
        {variant === "panel" ? (
          <Animated.View
            className="w-full items-center"
            style={[
              {
                backgroundColor: tokens.colors.accent,
                paddingTop: 8,
                paddingBottom: panelSafeBottom + 12,
                paddingHorizontal: 24,
              },
              contentStyle,
            ]}
          >
            <Animated.View
              className="h-1 w-12 rounded-full"
              style={[{ backgroundColor: "#00000022" }, handleStyle]}
            />

            <Animated.View className="mt-3 min-h-11 flex-row items-center justify-center" style={handleStyle}>
              <Ionicons name="chevron-up" size={16} color={tokens.colors.black} />
              <AppText
                variant="xl"
                className="ml-2"
                style={{ color: tokens.colors.black, fontFamily: "Inter_600SemiBold" }}
              >
                {label}
              </AppText>
            </Animated.View>

            {children}
          </Animated.View>
        ) : (
          <>
            <Animated.View
              className="mb-2 min-h-11 flex-row items-center justify-center rounded-lg border px-4"
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
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export default SwipeUpToSubmit;
