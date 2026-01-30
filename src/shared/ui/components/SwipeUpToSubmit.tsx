import { useRef } from "react";
import { Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type Props = {
  onSubmit: () => void;
  label?: string;
};

const HEIGHT = 76; // big, thumb-friendly
const MAX_PULL = 60; // how far it can move
const TRIGGER = 46; // swipe distance needed to submit (Robinhood-ish)

export function SwipeUpToSubmit({ onSubmit, label = "SWIPE UP TO SUBMIT" }: Props) {
  const y = useSharedValue(0); // 0 -> -MAX_PULL
  const firedRef = useRef(false);

  const progress = useDerivedValue(() => {
    const p = Math.min(1, Math.max(0, -y.value / MAX_PULL));
    return p;
  });

  const trigger = () => {
    if (firedRef.current) return;
    firedRef.current = true;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onSubmit();
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onUpdate((e) => {
      // clamp to upward pull only
      const next = Math.max(-MAX_PULL, Math.min(0, e.translationY));
      y.value = next;
    })
    .onEnd(() => {
      const pulled = -y.value;

      if (pulled >= TRIGGER) {
        // snap to top and submit safely on JS thread
        y.value = withSpring(-MAX_PULL, { damping: 18, stiffness: 220 });
        runOnJS(trigger)();
        return;
      }

      // reset
      y.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [0, -10], Extrapolate.CLAMP) }],
    opacity: interpolate(progress.value, [0, 0.15, 1], [0.85, 1, 1], Extrapolate.CLAMP),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.85, 1], [1, 0.25, 0], Extrapolate.CLAMP),
  }));

  const releaseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.75, 1], [0, 0, 1], Extrapolate.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={{
          height: HEIGHT,
          borderRadius: 999,
          backgroundColor: "#00C805", // Robinhood green
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {/* subtle dark “cap” so it doesn’t look flat */}
        <Animated.View
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.12)",
            opacity: interpolate(progress.value, [0, 1], [0.18, 0], Extrapolate.CLAMP),
          }}
        />

        {/* moving content (feels like you’re pulling the bar) */}
        <Animated.View style={knobStyle}>
          <Animated.View style={[{ alignItems: "center" }, arrowStyle]}>
            <Ionicons name="chevron-up" size={22} color="#000000" />
          </Animated.View>

          <Animated.View style={[{ marginTop: 6, alignItems: "center" }, labelStyle]}>
            <Text style={{ color: "#000000", fontWeight: "800", letterSpacing: 1.2 }}>{label}</Text>
          </Animated.View>

          <Animated.View
            style={[
              {
                position: "absolute",
                left: 0,
                right: 0,
                top: 28,
                alignItems: "center",
              },
              releaseStyle,
            ]}
          >
            <Text style={{ color: "#000000", fontWeight: "800", letterSpacing: 1.2 }}>
              RELEASE TO SUBMIT
            </Text>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}