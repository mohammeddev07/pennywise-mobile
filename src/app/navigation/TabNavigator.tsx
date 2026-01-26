import React, { useMemo } from "react";
import { createBottomTabNavigator, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "./navigationTypes";
import { View, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

import { HomeScreen } from "../../screens/HomeScreen";
import { InsightsScreen } from "../../screens/InsightsScreen";
import { BudgetScreen } from "../../screens/BudgetScreen";
import { ProfileScreen } from "../../screens/ProfileScreen";

const Tab = createBottomTabNavigator<TabParamList>();

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const containerBg = isDark ? "bg-cardDark border border-gray-700/50" : "bg-white";
    const shadowStyle = isDark ? "shadow-[0px_8px_30px_rgba(0,0,0,0.5)]" : "shadow-[0px_8px_30px_rgba(0,0,0,0.12)]";

    const activeColor = isDark ? "#10b981" : "#2b4bee";
    const inactiveColor = isDark ? "#94a3b8" : "#9ca3af";

    const routeNames = state.routes.map((r) => r.name);

    const left = routeNames.slice(0, 2);
    const right = routeNames.slice(2);

    function renderTab(name: string) {
        const index = state.routes.findIndex((r) => r.name === name);
        const isFocused = state.index === index;
        const options = descriptors[state.routes[index].key].options;

        const label =
            typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : options.title ?? name;

        const iconName =
            name === "Home"
                ? "home"
                : name === "Insights"
                    ? "analytics"
                    : name === "Budget"
                        ? "account-balance-wallet"
                        : "person";

        const onPress = () => navigation.navigate(name as never);

        return (
            <Pressable
                key={name}
                onPress={onPress}
                className="flex-1 items-center justify-center gap-1 p-2"
                android_ripple={{ color: isDark ? "#ffffff10" : "#00000010", borderless: true }}
            >
                <MaterialIcons name={iconName as any} size={24} color={isFocused ? activeColor : inactiveColor} />
                <Text
                    className={`text-[10px] ${isFocused ? "font-semibold" : "font-medium"} ${isDark ? "" : ""}`}
                    style={{ color: isFocused ? activeColor : inactiveColor }}
                >
                    {label}
                </Text>
            </Pressable>
        );
    }

    const onPressFab = () => {
        // Navigate to RootStack modal from inside tabs:
        navigation.getParent()?.navigate("AddTransaction" as never);
    };

    const fabBg = isDark ? "#10b981" : "#2b4bee";
    const fabShadow = isDark ? "shadow-lg" : "shadow-lg";

    return (
        <View
            pointerEvents="box-none"
            style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: Math.max(12, insets.bottom + 12),
                alignItems: "center"
            }}
        >
            <View className={`w-[90%] max-w-[400px]`}>
                <View className={`h-[72px] flex-row items-center justify-between rounded-2xl px-2 ${containerBg} ${shadowStyle}`}>
                    <View className="flex-1 flex-row">
                        {left.map(renderTab)}
                    </View>

                    <View className="relative -top-8 items-center justify-center">
                        <Pressable
                            onPress={onPressFab}
                            className={`h-14 w-14 items-center justify-center rounded-full ${fabShadow}`}
                            style={{
                                backgroundColor: fabBg,
                                borderWidth: isDark ? 4 : 0,
                                borderColor: isDark ? "#0f172a" : "transparent"
                            }}
                        >
                            <MaterialIcons name="add" size={28} color="#fff" />
                        </Pressable>
                    </View>

                    <View className="flex-1 flex-row">
                        {right.map(renderTab)}
                    </View>
                </View>
            </View>
        </View>
    );
}

export function TabNavigator() {
    // Keep screens “clean”; we do our own floating tab bar.
    const screenOptions = useMemo(
        () => ({
            headerShown: false
        }),
        []
    );

    return (
        <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={screenOptions}>
            <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />
            <Tab.Screen name="Insights" component={InsightsScreen} options={{ title: "Analytics" }} />
            <Tab.Screen name="Budget" component={BudgetScreen} options={{ title: "Budget" }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
        </Tab.Navigator>
    );
}
