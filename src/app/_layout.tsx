import "react-native-gesture-handler";
import "../../global.css";

import { useEffect, useMemo } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { Text, TextInput, View } from "react-native";
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";

import { tokens } from "@/shared/ui/theme/tokens";
import { UndoToast } from "@/shared/ui/components/UndoToast";

SplashScreen.preventAutoHideAsync().catch(() => {});

function applyDefaultFont() {
  const TextAny = Text as any;
  const TextInputAny = TextInput as any;

  TextAny.defaultProps = TextAny.defaultProps || {};
  TextInputAny.defaultProps = TextInputAny.defaultProps || {};

  TextAny.defaultProps.style = [{ fontFamily: "Inter_400Regular" }, TextAny.defaultProps.style].filter(Boolean);
  TextInputAny.defaultProps.style = [{ fontFamily: "Inter_400Regular" }, TextInputAny.defaultProps.style].filter(Boolean);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 0, staleTime: 10_000 },
        },
      }),
    []
  );

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    applyDefaultFont();
    SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: tokens.colors.app },
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="modals"
                options={{
                  presentation: "modal",
                }}
              />
            </Stack>

            <UndoToast />
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
