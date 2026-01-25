import "react-native-gesture-handler";
import "./global.css";

import { useEffect, useMemo } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Text, TextInput } from "react-native";
import { useFonts, Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { useColorScheme } from "nativewind";

import { RootNavigator } from "./src/app/navigation/RootNavigator";
import { useAppStore } from "./src/state/appStore";
import { getNavTheme } from "./src/theme/navTheme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function applyDefaultFont() {
  const textAny = Text as any;
  const inputAny = TextInput as any;

  textAny.defaultProps = textAny.defaultProps || {};
  inputAny.defaultProps = inputAny.defaultProps || {};

  const baseTextStyle = [{ fontFamily: "Inter_400Regular" }, textAny.defaultProps.style].filter(Boolean);
  const baseInputStyle = [{ fontFamily: "Inter_400Regular" }, inputAny.defaultProps.style].filter(Boolean);

  textAny.defaultProps.style = baseTextStyle;
  inputAny.defaultProps.style = baseInputStyle;
}

function ThemeBridge() {
  const themeMode = useAppStore((s) => s.themeMode);
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    // Default dark unless user changes
    const desired = themeMode === "system" ? "system" : themeMode;
    if (desired !== colorScheme) setColorScheme(desired);
  }, [themeMode, colorScheme, setColorScheme]);

  return null;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold
  });

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 0,
            staleTime: 10_000
          }
        }
      }),
    []
  );

  useEffect(() => {
    if (!fontsLoaded) return;
    applyDefaultFont();
    SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  const { colorScheme } = useColorScheme();
  const navTheme = getNavTheme(colorScheme);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeBridge />
        <NavigationContainer theme={navTheme}>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <RootNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
