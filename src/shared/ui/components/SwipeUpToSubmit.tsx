import { useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type Props = {
  onSubmit: () => void;
  disabled?: boolean;
  label?: string;
};

/**
 * Robinhood-ish swipe-up control:
 * - Drag the pill upward
 * - If drag distance crosses threshold → success haptic → complete → calls onSubmit
 */
export function SwipeUpToSubmit({ onSubmit, disabled, label = "Swipe up to submit" }: Props) {
  const [measured, setMeasured] = useState({ height: 0 });
  const didTriggerRef = useRef(false);
  const didHapticThresholdRef = useRef(false);

  const translateY = useSharedValue(0);
  const progress = useSharedValue(0);

  // Micro-interaction tuning
  const MAX_PULL = useMemo(() => 140, []); // px
  const THRESHOLD = useMemo(() => 92, []); // px to trigger submit (≈ 2 thumb-nudges)

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

  const complete = () => {
    if (didTriggerRef.current) return;
    didTriggerRef.current = true;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Fly up + fade
    translateY.value = withTiming(-MAX_PULL - 40, { duration: 220 });
    progress.value = withTiming(1, { duration: 180 }, (finished) => {
      if (finished) runOnJS(onSubmit)();
    });
  };

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      // reset haptic gate each interaction
      didHapticThresholdRef.current = false;
      Haptics.selectionAsync().catch(() => {});
    })
    .onUpdate((e) => {
      // Swiping up => negative translationY, we store negative
      const next = clamp(e.translationY, -MAX_PULL, 0);
      translateY.value = next;

      const pulled = Math.abs(next);
      const p = clamp(pulled / THRESHOLD, 0, 1);
      progress.value = p;

      if (!didHapticThresholdRef.current && pulled >= THRESHOLD) {
        didHapticThresholdRef.current = true;
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      }
    })
    .onEnd(() => {
      const pulled = Math.abs(translateY.value);

      if (pulled >= THRESHOLD) {
        runOnJS(complete)();
        return;
      }

      // Spring back
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      progress.value = withTiming(0, { duration: 140 });
    });

  const pillStyle = useAnimatedStyle(() => {
    const pulled = Math.abs(translateY.value);
    const scale = interpolate(pulled, [0, THRESHOLD], [1, 0.985]);
    const opacity = interpolate(progress.value, [0, 1], [1, 0.92]);
    return {
      transform: [{ translateY: translateY.value }, { scale }],
      opacity,
    };
  });

  const fillStyle = useAnimatedStyle(() => {
    const o = interpolate(progress.value, [0, 1], [0, 1]);
    return { opacity: o };
  });

  const labelStyle = useAnimatedStyle(() => {
    const o = interpolate(progress.value, [0, 1], [1, 0.35]);
    return { opacity: o };
  });

  return (
    <View
      onLayout={(e) => setMeasured({ height: e.nativeEvent.layout.height })}
      className="w-full"
    >
      <GestureDetector gesture={gesture}>
        <Animated.View
          className={`h-14 w-full rounded-full border border-stroke bg-surface overflow-hidden items-center justify-center ${
            disabled ? "opacity-50" : ""
          }`}
          style={pillStyle}
        >
          {/* Accent fill that fades in as you approach threshold */}
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0 bg-accent"
            style={fillStyle}
          />

          <Animated.View style={labelStyle} className="flex-row items-center gap-2">
            <Ionicons name="arrow-up" size={16} color="#93A4B7" />
            <Text className="text-muted font-semibold">{label}</Text>
          </Animated.View>

          {/* When filled, swap to “Release to submit” */}
          <Animated.View
            pointerEvents="none"
            style={fillStyle}
            className="absolute flex-row items-center gap-2"
          >
            <Ionicons name="checkmark" size={18} color="#000000" />
            <Text className="text-black font-semibold">Release to submit</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
