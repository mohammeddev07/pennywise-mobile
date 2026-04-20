import { useState } from "react";
import { View } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

const iconFor = (name: string) => {
  switch (name) {
    case "home":
      return "home";
    case "transactions":
      return "list";
    case "analytics":
      return "pie-chart";
    case "categories":
      return "pricetags";
    case "settings":
      return "settings";
    default:
      return "ellipse";
  }
};

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [fabPressed, setFabPressed] = useState(false);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: (insets.bottom || 0) + 14,
      }}
    >
      {/* Glass container */}
      <View style={{ borderRadius: 34, overflow: "hidden" }}>
        <BlurView intensity={32} tint="dark">
          <View
            style={{
              borderRadius: 34,
              borderWidth: 1,
              borderColor: tokens.colors.stroke,
              paddingVertical: 14,
              paddingHorizontal: 14,
              backgroundColor: "rgba(10,12,16,0.35)",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              {state.routes.map((route, index) => {
                const isFocused = state.index === index;

                return (
                  <HapticPressable
                    key={route.key}
                    haptic="selection"
                    pressScale={0.92}
                    onPress={() => {
                      const event = navigation.emit({
                        type: "tabPress",
                        target: route.key,
                        canPreventDefault: true,
                      });
                      if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name as never);
                      }
                    }}
                    style={{
                      width: 54,
                      height: 44,
                      borderRadius: 22,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isFocused ? "rgba(255,255,255,0.06)" : "transparent",
                      borderWidth: isFocused ? 1 : 0,
                      borderColor: isFocused ? tokens.colors.stroke : "transparent",
                    }}
                  >
                    <Ionicons
                      name={iconFor(route.name) as any}
                      size={20}
                      color={isFocused ? tokens.colors.accent : tokens.colors.muted}
                    />
                  </HapticPressable>
                );
              })}
            </View>
          </View>
        </BlurView>
      </View>

      {/* Center Add button */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: -64,
          alignItems: "center",
        }}
      >
        <HapticPressable
          haptic="impactMedium"
          pressScale={0.94}
          pressOpacity={1}
          onPressIn={() => setFabPressed(true)}
          onPressOut={() => setFabPressed(false)}
          onPress={() => {
            router.push("/modals/add-transaction");
          }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: fabPressed ? tokens.colors.accentPressed : tokens.colors.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="add" size={24} color="#FFFFFF" />
        </HapticPressable>
      </View>
    </View>
  );
}

export default GlassTabBar;
