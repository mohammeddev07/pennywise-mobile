import { useEffect } from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { fonts, tokens } from "@/shared/ui/theme/tokens";
import { withAlpha } from "@/shared/ui/theme/color";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { Icon, type IconName } from "./Icon";

/**
 * The app's only bottom navigation.
 *
 * Height, spacing, icon size, label size, safe-area handling and the active
 * treatment are defined once here, so every tab screen gets an identical bar.
 * Screens must never render their own.
 *
 * It is a floating pill that blurs whatever scrolls beneath it - the one place
 * in the app that uses blur - and it carries no drop shadow. The only glow is
 * on the add button.
 */

const ICONS: Record<string, { active: IconName; inactive: IconName }> = {
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

/**
 * Inactive tabs use the secondary text color rather than the tertiary one the
 * mock draws. Tertiary on this surface lands near 3:1, and these labels are
 * 11px - readability wins over the extra half-step of recession.
 */
const INACTIVE = tokens.colors.muted;

function AddButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <HapticPressable
      // Silent: opening a screen is a read. The write it leads to is what
      // gets the haptic.
      haptic="none"
      pressScale={1} // handled here so the press reads on the circle itself
      pressOpacity={1}
      onPressIn={() => {
        scale.value = withTiming(0.92, { duration: tokens.motion.pressIn });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, tokens.spring.key);
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add transaction"
      android_ripple={{ color: tokens.colors.rippleOnAccent, borderless: true }}
      style={{ width: 72, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View
        style={[
          {
            width: tokens.layout.fabSize,
            height: tokens.layout.fabSize,
            borderRadius: tokens.layout.fabSize / 2,
            alignItems: "center",
            justifyContent: "center",
            marginTop: -26,
            ...tokens.glow.accent,
          },
          animated,
        ]}
      >
        <LinearGradient
          colors={[withAlpha(tokens.colors.accent, 1), tokens.colors.accentPressed]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: tokens.layout.fabSize / 2,
            alignItems: "center",
            justifyContent: "center",
            // The top-edge highlight that lifts every raised surface.
            borderTopWidth: 1,
            borderTopColor: withAlpha(tokens.colors.white, 0.45),
          }}
        >
          <Icon name="add" size={26} color={tokens.colors.onAccent} strokeWidth={2.6} />
        </LinearGradient>
      </Animated.View>
    </HapticPressable>
  );
}

/** One tab. The icon springs 1 -> 1.12 -> 1 when the tab becomes active. */
function NavItem({
  name,
  isFocused,
  onPress,
}: {
  name: string;
  isFocused: boolean;
  onPress: () => void;
}) {
  const pop = useSharedValue(1);
  const icon = ICONS[name] ?? { active: "ellipse" as IconName, inactive: "ellipse-outline" as IconName };
  const color = isFocused ? tokens.colors.accent : INACTIVE;

  useEffect(() => {
    if (!isFocused) return;
    pop.value = withSequence(withTiming(1.12, { duration: 110 }), withSpring(1, tokens.spring.snappy));
  }, [isFocused, pop]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <HapticPressable
      // Tab navigation is explicitly silent - haptics confirm writes, not reads.
      haptic="none"
      pressScale={0.94}
      pressOpacity={1}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={LABELS[name] ?? name}
      onPress={onPress}
      style={{
        flex: 1,
        height: tokens.layout.tabBarHeight - tokens.space[2],
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <Animated.View style={animated}>
        <Icon name={isFocused ? icon.active : icon.inactive} size={tokens.icon.nav} color={color} />
      </Animated.View>
      <AppText
        variant="xs"
        numberOfLines={1}
        style={{
          color,
          fontSize: 10,
          letterSpacing: 0,
          fontFamily: isFocused ? fonts.bold : fonts.semibold,
        }}
      >
        {LABELS[name] ?? name}
      </AppText>
    </HapticPressable>
  );
}

/**
 * Only the two fields the bar actually reads.
 *
 * expo-router and @react-navigation/bottom-tabs each publish their own
 * `BottomTabBarProps` and the two drifted apart in SDK 57, so naming either one
 * makes this component fail to typecheck against the other. A structural type
 * satisfies both and says exactly what the bar depends on.
 */
type NavBarProps = {
  state: {
    index: number;
    routes: readonly { key: string; name: string }[];
  };
  navigation: {
    emit(event: { type: "tabPress"; target: string; canPreventDefault: true }): {
      defaultPrevented: boolean;
    };
    navigate(name: never): void;
  };
};

export function BottomNavigation({ state, navigation }: NavBarProps) {
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
        left: tokens.space[3],
        right: tokens.space[3],
        bottom: (insets.bottom || 0) + tokens.space[3],
      }}
    >
      <View
        style={{
          height: tokens.layout.tabBarHeight,
          borderRadius: tokens.radii.pill,
          borderWidth: 1,
          borderColor: tokens.colors.stroke,
          overflow: "hidden",
        }}
      >
        <BlurView
          intensity={Platform.OS === "android" ? 0 : 18}
          tint="dark"
          style={{
            flex: 1,
            // The blur alone is too transparent to keep 11px labels legible
            // over scrolling content, so the surface color carries most of it.
            backgroundColor: withAlpha(tokens.colors.surfaceAlt, Platform.OS === "android" ? 0.98 : 0.9),
            paddingHorizontal: tokens.space[2],
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {items.map((route) => {
            if (route.name === "__add__") {
              return <AddButton key="__add__" onPress={() => router.push("/modals/add-transaction")} />;
            }

            const index = state.routes.findIndex((r) => r.key === route.key);
            const isFocused = state.index === index;

            return (
              <NavItem
                key={route.key}
                name={route.name}
                isFocused={isFocused}
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
              />
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}

export default BottomNavigation;
