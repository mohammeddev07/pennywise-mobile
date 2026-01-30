import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

const EMERALD = "#00C805";

function TabIcon({ name, focused }: { name: keyof typeof Ionicons.glyphMap; focused: boolean }) {
  return <Ionicons name={name} size={22} color={focused ? EMERALD : "#6B7280"} />;
}

export function FloatingTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { state, navigation } = props;

  const routes = useMemo(() => state.routes, [state.routes]);

  const onPressTab = async (routeName: string, index: number, isFocused: boolean) => {
    await Haptics.selectionAsync();
    if (!isFocused) navigation.navigate(routeName as never);
  };

  const containerBottom = Math.max(insets.bottom, 12);

  return (
    <View pointerEvents="box-none" className="absolute left-0 right-0" style={{ bottom: 0 }}>
      <View
        className="mx-4 flex-row items-center justify-between rounded-[28px] bg-black/90 px-5"
        style={{
          paddingBottom: containerBottom,
          paddingTop: 14,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.06)"
        }}
      >
        {routes.slice(0, 2).map((r, i) => {
          const index = i;
          const isFocused = state.index === index;

          return (
            <Pressable
              key={r.key}
              onPress={() => onPressTab(r.name, index, isFocused)}
              className="flex-1 items-center justify-center"
              hitSlop={12}
            >
              <TabIcon name={index === 0 ? "home" : "bar-chart"} focused={isFocused} />
              <Text className={`mt-1 text-[10px] ${isFocused ? "text-emerald-400" : "text-zinc-500"}`}>
                {index === 0 ? "Home" : "Analytics"}
              </Text>
            </Pressable>
          );
        })}

        {/* Floating + */}
        <PlusButton />

        {routes.slice(2, 4).map((r, i) => {
          const index = i + 2;
          const isFocused = state.index === index;

          return (
            <Pressable
              key={r.key}
              onPress={() => onPressTab(r.name, index, isFocused)}
              className="flex-1 items-center justify-center"
              hitSlop={12}
            >
              <TabIcon name={index === 2 ? "wallet" : "person"} focused={isFocused} />
              <Text className={`mt-1 text-[10px] ${isFocused ? "text-emerald-400" : "text-zinc-500"}`}>
                {index === 2 ? "Budget" : "Profile"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PlusButton() {
  const s = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }]
  }));

  const onPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    s.value = withSpring(1.12, { damping: 12, stiffness: 280 }, () => {
      s.value = withSpring(1, { damping: 14, stiffness: 260 });
    });
    router.push("/add-transaction");
  };

  return (
    <Pressable onPress={onPress} hitSlop={16} className="mx-3">
      <Animated.View
        style={style}
        className="h-14 w-14 items-center justify-center rounded-full bg-emerald-400"
      >
        <Ionicons name="add" size={26} color="#000" />
      </Animated.View>
    </Pressable>
  );
}
