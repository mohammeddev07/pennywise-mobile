import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";

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
          borderRadius: 18,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: tokens.colors.stroke,
          backgroundColor: "rgba(16, 21, 29, 0.92)",
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
            backgroundColor: "#00C80522",
            borderWidth: 1,
            borderColor: tokens.colors.stroke,
          }}
        >
          <Ionicons name="trash-outline" size={18} color={tokens.colors.accent} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text className="text-text font-semibold">{title}</Text>
          <Text className="text-muted text-xs mt-0.5">Undo available for a few seconds</Text>
        </View>

        <Pressable
          onPress={undo}
          className="px-4 py-2 rounded-full border"
          style={{ borderColor: `${tokens.colors.accent}55`, backgroundColor: "#00C80514" }}
          android_ripple={{ color: "#00C80522" }}
        >
          <Text style={{ color: tokens.colors.accent }} className="font-semibold">
            Undo
          </Text>
        </Pressable>

        <Pressable
          onPress={hide}
          className="ml-2 h-10 w-10 items-center justify-center rounded-full"
          android_ripple={{ color: "#FFFFFF10", borderless: true }}
        >
          <Ionicons name="close" size={18} color={tokens.colors.muted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default UndoToast;
