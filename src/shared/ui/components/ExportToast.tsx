import { useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import { useExportToastStore } from "@/shared/ui/state/useExportToastStore";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";

export function ExportToast() {
  const insets = useSafeAreaInsets();

  const visible = useExportToastStore((s) => s.visible);
  const message = useExportToastStore((s) => s.message);
  const hide = useExportToastStore((s) => s.hide);

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
            backgroundColor: tokens.colors.greenSoft,
            borderWidth: 1,
            borderColor: tokens.colors.stroke,
          }}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color={tokens.colors.success} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="sm" weight="semibold">
            {message}
          </AppText>
        </View>

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

export default ExportToast;
