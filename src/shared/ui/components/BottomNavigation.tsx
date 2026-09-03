import { View } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { fonts, tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";

/**
 * The app's only bottom navigation.
 *
 * Height, spacing, icon size, label size, safe-area handling and the active
 * treatment are defined once here, so every tab screen gets an identical bar.
 * Screens must never render their own.
 */

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  home: { active: "home", inactive: "home-outline" },
  transactions: { active: "receipt", inactive: "receipt-outline" },
  analytics: { active: "stats-chart", inactive: "stats-chart-outline" },
  categories: { active: "grid", inactive: "grid-outline" },
  settings: { active: "person", inactive: "person-outline" },
};

const LABELS: Record<string, string> = {
  home: "Home",
  transactions: "Activity",
  analytics: "Insights",
  categories: "Categories",
  settings: "Profile",
};

/**
 * Tabs the bar shows, in order. `categories` is a registered route but not a
 * bar slot: a six-item bar left no room for the center action, and the screen
 * is reached from Profile > Manage categories instead. Nothing is unreachable.
 */
const VISIBLE_TABS = ["home", "transactions", "analytics", "settings"];

const NAV_ICON_SIZE = 22;

function AddButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <HapticPressable
      haptic="impactMedium"
      pressScale={1} // handled here so the press reads on the circle itself
      pressOpacity={1}
      onPressIn={() => {
        scale.value = withTiming(0.92, { duration: tokens.motion.fast });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: tokens.motion.base });
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add transaction"
      android_ripple={{ color: tokens.colors.rippleOnAccent, borderless: true }}
      style={{ width: 64, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View
        style={[
          {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: tokens.colors.accent,
            alignItems: "center",
            justifyContent: "center",
            marginTop: -18,
            ...tokens.elevation.tabBar.ios,
          },
          animated,
        ]}
      >
        <Ionicons name="add" size={28} color={tokens.colors.onAccent} />
      </Animated.View>
    </HapticPressable>
  );
}

export function BottomNavigation({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // The add button is not a route - it opens the add-transaction modal - so it
  // is spliced into the middle of the real tabs rather than registered as one.
  const visible = VISIBLE_TABS.map((name) => state.routes.find((r) => r.name === name)).filter(
    (r): r is (typeof state.routes)[number] => Boolean(r)
  );
  const half = Math.ceil(visible.length / 2);
  const items = [
    ...visible.slice(0, half),
    { key: "__add__", name: "__add__" } as (typeof state.routes)[number],
    ...visible.slice(half),
  ];

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: tokens.space[4],
        right: tokens.space[4],
        bottom: (insets.bottom || 0) + tokens.space[3],
      }}
    >
      <View
        style={{
          height: tokens.layout.tabBarHeight,
          borderRadius: tokens.radii.xl,
          borderWidth: 1,
          borderColor: tokens.colors.stroke,
          backgroundColor: tokens.colors.surfaceAlt,
          paddingHorizontal: tokens.space[2],
          flexDirection: "row",
          alignItems: "center",
          ...tokens.elevation.tabBar.ios,
        }}
      >
        {items.map((route) => {
          if (route.name === "__add__") {
            return <AddButton key="__add__" onPress={() => router.push("/modals/add-transaction")} />;
          }

          const index = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === index;
          const icon = ICONS[route.name] ?? { active: "ellipse", inactive: "ellipse-outline" };
          const color = isFocused ? tokens.colors.accent : tokens.colors.muted;

          return (
            <HapticPressable
              key={route.key}
              haptic="selection"
              pressScale={0.94}
              pressOpacity={1}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={LABELS[route.name] ?? route.name}
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
                flex: 1,
                height: tokens.layout.tabBarHeight - tokens.space[2],
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
              }}
            >
              <Ionicons name={isFocused ? icon.active : icon.inactive} size={NAV_ICON_SIZE} color={color} />
              <AppText
                variant="xs"
                numberOfLines={1}
                style={{
                  color,
                  fontSize: 11,
                  letterSpacing: 0,
                  fontFamily: isFocused ? fonts.semibold : fonts.medium,
                }}
              >
                {LABELS[route.name] ?? route.name}
              </AppText>
            </HapticPressable>
          );
        })}
      </View>
    </View>
  );
}

export default BottomNavigation;
