import { View } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";

const iconFor = (name: string) => {
  switch (name) {
    case "home":
      return "home";
    case "transactions":
      return "list";
    case "analytics":
      return "pie-chart";
    case "categories":
      return "grid";
    case "settings":
      return "person";
    default:
      return "ellipse";
  }
};

const labelFor = (name: string) => {
  switch (name) {
    case "transactions":
      return "Activity";
    case "analytics":
      return "Insights";
    case "settings":
      return "Profile";
    default:
      return name.slice(0, 1).toUpperCase() + name.slice(1);
  }
};

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const first = state.routes.slice(0, 2);
  const second = state.routes.slice(2);
  const routes = [...first, { key: "add", name: "__add__" } as any, ...second];

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 18,
        right: 18,
        bottom: (insets.bottom || 0) + 14,
      }}
    >
      <View
        style={{
          minHeight: 78,
          borderRadius: 32,
          borderWidth: 1,
          borderColor: tokens.colors.stroke,
          backgroundColor: tokens.colors.surface,
          paddingHorizontal: 8,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          ...tokens.elevation.tabBar.ios,
        }}
      >
        {routes.map((route) => {
          if (route.name === "__add__") {
            return (
              <HapticPressable
                key={route.key}
                haptic="impactMedium"
                pressScale={0.94}
                pressOpacity={1}
                onPress={() => router.push("/modals/add-transaction")}
                android_ripple={{ color: "#FFFFFF22", borderless: true }}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: tokens.colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -20,
                  ...tokens.elevation.tabBar.ios,
                }}
              >
                <MaterialIcons name="add" size={34} color={tokens.colors.white} />
              </HapticPressable>
            );
          }

          const index = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === index;

          return (
            <HapticPressable
              key={route.key}
              haptic="selection"
              pressScale={0.96}
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
                width: 50,
                minHeight: 58,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isFocused ? tokens.colors.greenSoft : "transparent",
              }}
            >
              <Ionicons
                name={iconFor(route.name) as any}
                size={24}
                color={isFocused ? tokens.colors.accent : tokens.colors.muted}
              />
              <AppText
                variant="xs"
                numberOfLines={1}
                style={{
                  marginTop: 3,
                  color: isFocused ? tokens.colors.accent : tokens.colors.muted,
                  fontFamily: isFocused ? "Inter_600SemiBold" : "Inter_500Medium",
                  fontSize: 9,
                }}
              >
                {labelFor(route.name)}
              </AppText>
            </HapticPressable>
          );
        })}
      </View>
    </View>
  );
}

export default GlassTabBar;
