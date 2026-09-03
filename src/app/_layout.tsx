import "react-native-gesture-handler";
import "../../global.css";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useAuthStore } from "@/features/auth/store";
import { useBooksStore } from "@/features/books/store";
import { useCategoriesStore } from "@/features/categories/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useBudgetsStore } from "@/features/budgets/store";

SplashScreen.preventAutoHideAsync().catch(() => {});

function applyDefaultFont() {
  const TextAny = Text as any;
  const TextInputAny = TextInput as any;

  TextAny.defaultProps = TextAny.defaultProps || {};
  TextInputAny.defaultProps = TextInputAny.defaultProps || {};

  TextAny.defaultProps.style = [{ fontFamily: "Inter_400Regular" }, TextAny.defaultProps.style].filter(Boolean);
  TextInputAny.defaultProps.style = [{ fontFamily: "Inter_400Regular" }, TextInputAny.defaultProps.style].filter(Boolean);
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function DataBootstrap() {
  const user = useAuthStore((s) => s.user);
  const sessionStatus = useAuthStore((s) => s.sessionStatus);
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted);
  const loadBooks = useBooksStore((s) => s.loadBooks);
  const ensureBook = useBooksStore((s) => s.ensureBook);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const loadCategories = useCategoriesStore((s) => s.loadCategories);
  const loadTransactions = useTransactionsStore((s) => s.loadTransactions);
  const loadBudgets = useBudgetsStore((s) => s.loadBudgets);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !user) return;
    if (onboardingCompleted) {
      ensureBook({
        name: "Personal",
        currencyCode: user.defaultCurrencyCode ?? "USD",
        openingBalanceMinor: 0,
      }).catch(() => {});
      return;
    }
    loadBooks().catch(() => {});
  }, [ensureBook, loadBooks, onboardingCompleted, sessionStatus, user]);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !user || !selectedBookId) return;
    loadCategories(selectedBookId).catch(() => {});
    loadTransactions(selectedBookId, { limit: 100 }).catch(() => {});
    loadBudgets(selectedBookId, currentMonthKey()).catch(() => {});
  }, [loadBudgets, loadCategories, loadTransactions, selectedBookId, sessionStatus, user]);

  return null;
}

export default function RootLayout() {
  const sessionStatus = useAuthStore((s) => s.sessionStatus);
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted);
  const hydrateAccessToken = useAuthStore((s) => s.hydrateAccessToken);
  const validateSession = useAuthStore((s) => s.validateSession);
  const authPersist = useAuthStore.persist;
  const [authStorageHydrated, setAuthStorageHydrated] = useState(() => authPersist.hasHydrated());
  const sessionBootstrapStarted = useRef(false);

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
    if (sessionStatus === "unauthenticated") queryClient.clear();
  }, [queryClient, sessionStatus]);

  useEffect(() => {
    const unsubscribe = authPersist.onFinishHydration(() => setAuthStorageHydrated(true));
    if (authPersist.hasHydrated()) setAuthStorageHydrated(true);
    else {
      void Promise.resolve(authPersist.rehydrate()).finally(() => setAuthStorageHydrated(true));
    }
    return unsubscribe;
  }, [authPersist]);

  useEffect(() => {
    if (!authStorageHydrated || sessionBootstrapStarted.current) return;
    sessionBootstrapStarted.current = true;

    void (async () => {
      try {
        await hydrateAccessToken();
        await validateSession();
      } catch {
        await useAuthStore.getState().logout();
      }
    })();
  }, [authStorageHydrated, hydrateAccessToken, validateSession]);

  useEffect(() => {
    if ((!fontsLoaded && !fontError) || sessionStatus === "resolving") return;
    applyDefaultFont();
    SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError, sessionStatus]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <DataBootstrap />
          <StatusBar style="light" />
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: tokens.colors.app },
              }}
            >
              <Stack.Protected guard={sessionStatus === "unauthenticated"}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
              <Stack.Protected guard={sessionStatus === "authenticated" && !onboardingCompleted}>
                <Stack.Screen name="(onboarding)" />
              </Stack.Protected>
              <Stack.Protected guard={sessionStatus === "authenticated" && onboardingCompleted}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="modals"
                  options={{
                    presentation: "modal",
                  }}
                />
              </Stack.Protected>
            </Stack>

            <UndoToast />
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
