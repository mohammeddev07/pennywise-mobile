import { useMemo } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { tokens } from "@/shared/ui/theme/tokens";

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, v));
}

export function SwipeUpToSubmit({ label, onSubmit }: { label: string; onSubmit: () => void }) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  const sheetH = useMemo(() => screenH + (insets.bottom || 0) + 40, [screenH, insets.bottom]);
  const collapsedH = useMemo(() => (insets.bottom || 0) + 96, [insets.bottom]);

  // translateY = 0 => fully shown
  // translateY = collapsed => only top strip visible
  const collapsed = useMemo(() => sheetH - collapsedH, [sheetH, collapsedH]);
  const y = useSharedValue(collapsed);

  const confirming = useSharedValue(0); // 0/1 to gate double submit

  const openPct = useAnimatedStyle(() => {
    const p = 1 - clamp(y.value / collapsed, 0, 1);
    return {
      opacity: interpolate(p, [0, 1], [0.0, 1.0], Extrapolate.CLAMP),
    };
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  const handleStyle = useAnimatedStyle(() => {
    const p = 1 - clamp(y.value / collapsed, 0, 1);
    return {
      opacity: interpolate(p, [0, 0.25, 1], [1, 1, 0], Extrapolate.CLAMP),
      transform: [{ translateY: interpolate(p, [0, 1], [0, -12], Extrapolate.CLAMP) }],
    };
  });

  const confirm = () => {
    if (confirming.value === 1) return;
    confirming.value = 1;

    y.value = withTiming(0, { duration: 190 }, (finished) => {
      if (!finished) return;
      runOnJS(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onSubmit();
      })();
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (confirming.value === 1) return;
      // dragging up reduces y
      const next = clamp(collapsed + e.translationY, 0, collapsed);
      y.value = next;
    })
    .onEnd((e) => {
      if (confirming.value === 1) return;

      const movedUpEnough = y.value < collapsed * 0.55;
      const fastUp = e.velocityY < -900;

      if (movedUpEnough || fastUp) {
        runOnJS(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}))();
        runOnJS(confirm)();
        return;
      }

      y.value = withTiming(collapsed, { duration: 170 });
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: sheetH,
            backgroundColor: tokens.colors.accent,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
          },
          sheetStyle,
        ]}
      >
        {/* collapsed handle */}
        <Animated.View style={[{ paddingTop: 14, paddingBottom: 12 }, handleStyle]}>
          <View style={{ alignItems: "center" }}>
            <View style={{ height: 4, width: 44, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.25)" }} />
          </View>

          <View style={{ marginTop: 12, alignItems: "center", justifyContent: "center", flexDirection: "row" }}>
            <Ionicons name="chevron-up" size={18} color="#061007" />
            <Text style={{ color: "#061007", fontWeight: "800", marginLeft: 8 }}>{label}</Text>
          </View>
        </Animated.View>

        {/* full takeover content */}
        <Animated.View
          style={[
            {
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingBottom: (insets.bottom || 0) + 20,
            },
            openPct,
          ]}
        >
          <Text style={{ color: "#061007", fontSize: 28, fontWeight: "900" }}>Confirming…</Text>
          <Text style={{ color: "#061007", opacity: 0.7, marginTop: 10 }}>Releasing to finish</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export default SwipeUpToSubmit;
