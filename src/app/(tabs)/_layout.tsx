import { Tabs } from "expo-router";
import BottomNavigation from "@/shared/ui/components/BottomNavigation";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <BottomNavigation {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="categories" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
