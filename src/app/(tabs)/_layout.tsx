import { Tabs } from "expo-router";
import GlassTabBar from "@/shared/ui/components/GlassTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <GlassTabBar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="categories" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
