import { View, Platform } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

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

  const halo = useSharedValue(0.0);
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value }));

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
          top: -24,
          alignItems: "center",
        }}
      >
        {/* Clean halo ring (no big green blob) */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              width: 92,
              height: 92,
              borderRadius: 46,
              borderWidth: 2,
              borderColor: "rgba(0,200,5,0.25)",
              backgroundColor: "rgba(0,200,5,0.06)",
            },
            haloStyle,
          ]}
        />

        <HapticPressable
          haptic="impactMedium"
          pressScale={0.92}
          onPress={() => {
            // halo pulse
            halo.value = withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) }, () => {
              halo.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
            });

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push("/modals/add-transaction");
          }}
          style={{
            width: 74,
            height: 74,
            borderRadius: 37,
            backgroundColor: tokens.colors.accent,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "rgba(0,0,0,0.22)",

            // keep shadow neutral/black to avoid green "mud"
            ...(Platform.OS === "android"
              ? { elevation: 8 }
              : {
                  shadowColor: "#000",
                  shadowOpacity: 0.35,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 10 },
                }),
          }}
        >
          {/* subtle inner ring */}
          <View
            style={{
              position: "absolute",
              width: 62,
              height: 62,
              borderRadius: 31,
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.18)",
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          />
          <Ionicons name="add" size={34} color="#061007" />
        </HapticPressable>
      </View>
    </View>
  );
}

export default GlassTabBar;
