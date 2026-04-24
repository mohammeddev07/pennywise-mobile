import { useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";

export function UndoToast() {
  const insets = useSafeAreaInsets();

  const visible = useUndoToastStore((s) => s.visible);
  const title = useUndoToastStore((s) => s.title);
  const undo = useUndoToastStore((s) => s.undo);
  const hide = useUndoToastStore((s) => s.hide);

  const y = useSharedValue(22);
  const o = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      y.value = withTiming(0, { duration: 170 });
      o.value = withTiming(1, { duration: 170 });
    } else {
      y.value = withTiming(22, { duration: 150 });
      o.value = withTiming(0, { duration: 150 });
    }
  }, [visible, y, o]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: (insets.bottom || 0) + 12,
          paddingHorizontal: 18,
        },
        wrapStyle,
      ]}
    >
      <View
        style={{
          borderRadius: 24,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: tokens.colors.stroke,
          backgroundColor: tokens.colors.surface,
          paddingVertical: 12,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            height: 34,
            width: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${tokens.colors.accent}22`,
            borderWidth: 1,
            borderColor: tokens.colors.stroke,
          }}
        >
          <Ionicons name="trash-outline" size={18} color={tokens.colors.accent} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="sm" style={{ fontFamily: "Inter_600SemiBold" }}>
            {title}
          </AppText>
          <AppText variant="xs" tone="muted" className="mt-0.5">
            Undo available for a few seconds
          </AppText>
        </View>

        <HapticPressable
          onPress={undo}
          haptic="selection"
          className="min-h-11 px-4 items-center justify-center rounded-full border"
          style={{ borderColor: `${tokens.colors.accent}55`, backgroundColor: `${tokens.colors.accent}14` }}
          android_ripple={{ color: `${tokens.colors.accent}22` }}
        >
          <AppText variant="sm" style={{ color: tokens.colors.accent, fontFamily: "Inter_600SemiBold" }}>
            Undo
          </AppText>
        </HapticPressable>

        <HapticPressable
          onPress={hide}
          haptic="selection"
          className="ml-2 h-10 w-10 items-center justify-center rounded-full"
          android_ripple={{ color: "#0B122012", borderless: true }}
        >
          <Ionicons name="close" size={18} color={tokens.colors.muted} />
        </HapticPressable>
      </View>
    </Animated.View>
  );
}

export default UndoToast;
