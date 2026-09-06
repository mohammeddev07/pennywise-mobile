import { useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { Icon } from "./Icon";

export function UndoToast() {
  const insets = useSafeAreaInsets();

  const visible = useUndoToastStore((s) => s.visible);
  const title = useUndoToastStore((s) => s.title);
  const message = useUndoToastStore((s) => s.message);
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
          paddingHorizontal: tokens.layout.screenPaddingX,
        },
        wrapStyle,
      ]}
    >
      <View
        style={{
          borderRadius: tokens.radii.lg,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: tokens.colors.stroke,
          backgroundColor: tokens.colors.surfaceAlt,
          paddingVertical: 12,
          ...tokens.elevation.toast.ios,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            height: 34,
            width: 34,
            borderRadius: tokens.radii.key,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: tokens.colors.redSoft,
          }}
        >
          <Icon name="alert-circle-outline" size={18} color={tokens.colors.danger} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="sm" weight="semibold">
            {title}
          </AppText>
          <AppText variant="xs" tone="muted" className="mt-0.5">
            {message}
          </AppText>
        </View>

        <HapticPressable
          onPress={hide}
          haptic="selection"
          className="ml-2 h-10 w-10 items-center justify-center rounded-full"
          android_ripple={{ color: tokens.colors.ripple, borderless: true }}
        >
          <Icon name="close" size={18} color={tokens.colors.muted} />
        </HapticPressable>
      </View>
    </Animated.View>
  );
}

export default UndoToast;
