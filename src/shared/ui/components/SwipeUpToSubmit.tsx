import { Text, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/shared/ui/theme/tokens";

type Props = {
  onSubmit: () => void;
  label?: string;
  disabled?: boolean;
};

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, v));
}

/**
 * Robinhood-like swipe:
 * - Full-height green sheet, initially translated down so only a footer is visible
 * - Drag up to reveal; commit snaps to full screen then calls onSubmit
 *
 * IMPORTANT: Avoid runOnJS(() => ...) inline closures inside worklets (can hard-crash Android).
 */
export function SwipeUpToSubmit({ onSubmit, label = "SWIPE UP TO SUBMIT", disabled }: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  const MIN_VISIBLE = 92; // visible bar when collapsed
  const FULL_H = screenH + (insets.bottom || 0); // full coverage
  const MAX_TRANSLATE = Math.max(0, FULL_H - (MIN_VISIBLE + (insets.bottom || 0)));

  const translateY = useSharedValue(MAX_TRANSLATE);
  const committed = useSharedValue(false);
  const didThresholdHaptic = useSharedValue(false);

  const THRESHOLD_PROGRESS = 0.62;
  const FAST_VELOCITY = -1200;

  // ✅ Stable JS functions (safe to call via runOnJS)
  const hapticThreshold = () => {
    try {
      // setTimeout makes it even less likely to trip edge-case native crashes
      setTimeout(() => {
        Haptics.selectionAsync().catch(() => {});
      }, 0);
    } catch {}
  };

  const hapticSuccess = () => {
    try {
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }, 0);
    } catch {}
  };

  const submitOnJS = () => {
    hapticSuccess();
    onSubmit();
  };

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      if (committed.value) return;

      const next = clamp(MAX_TRANSLATE + e.translationY, 0, MAX_TRANSLATE);
      translateY.value = next;

      const p = MAX_TRANSLATE === 0 ? 1 : 1 - next / MAX_TRANSLATE;

      if (!didThresholdHaptic.value && p >= THRESHOLD_PROGRESS) {
        didThresholdHaptic.value = true;
        runOnJS(hapticThreshold)();
      }
      if (didThresholdHaptic.value && p < THRESHOLD_PROGRESS - 0.12) {
        didThresholdHaptic.value = false;
      }
    })
    .onEnd((e) => {
      if (committed.value) return;

      const p = MAX_TRANSLATE === 0 ? 1 : 1 - translateY.value / MAX_TRANSLATE;
      const shouldCommit = p >= THRESHOLD_PROGRESS || e.velocityY <= FAST_VELOCITY;

      if (shouldCommit) {
        committed.value = true;

        translateY.value = withTiming(
          0,
          { duration: 240, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (!finished) return;
            runOnJS(submitOnJS)();
          }
        );
        return;
      }

      translateY.value = withSpring(MAX_TRANSLATE, { damping: 18, stiffness: 180 });
      didThresholdHaptic.value = false;
    });

  const sheetStyle = useAnimatedStyle(() => {
    const p = MAX_TRANSLATE === 0 ? 1 : 1 - translateY.value / MAX_TRANSLATE;
    const mx = interpolate(p, [0, 1], [18, 0], Extrapolate.CLAMP);
    const r = interpolate(p, [0, 1], [34, 0], Extrapolate.CLAMP);

    return {
      height: FULL_H,
      transform: [{ translateY: translateY.value }],
      marginHorizontal: mx,
      borderRadius: r,
      backgroundColor: disabled ? "#0E141B" : tokens.colors.accent,
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    const p = MAX_TRANSLATE === 0 ? 1 : 1 - translateY.value / MAX_TRANSLATE;
    const lift = interpolate(p, [0, 1], [0, -10], Extrapolate.CLAMP);
    return { transform: [{ translateY: lift }] };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
          },
          sheetStyle,
        ]}
      >
        {/* Affordance always centered in the visible bar */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              paddingBottom: (insets.bottom || 0) + 18,
              paddingTop: 14,
              alignItems: "center",
              justifyContent: "center",
            },
            labelStyle,
          ]}
        >
          <Ionicons name="chevron-up" size={22} color={tokens.colors.ink} />
          <Text
            style={{
              marginTop: 8,
              color: tokens.colors.ink,
              fontSize: 15,
              letterSpacing: 1.2,
              fontWeight: "800",
              opacity: disabled ? 0.55 : 1,
              textAlign: "center",
            }}
          >
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export default SwipeUpToSubmit;
