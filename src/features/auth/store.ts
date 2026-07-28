import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ACCESS_TOKEN_KEY } from "@/shared/api/client";
import * as authApi from "@/shared/api/auth";
import type { MeResponse } from "@/shared/types/api";
import { useSettingsStore, type CurrencyCode } from "@/features/settings/store";
import { bumpAccountEpoch } from "@/shared/session/accountEpoch";

export const AUTH_STORAGE_KEY = "pennywise_demo_auth_v1";

const ACCOUNT_STORAGE_KEYS = [
  AUTH_STORAGE_KEY,
  "pennywise_books_v1",
  "pennywise_categories_v1",
  "pennywise_budgets_v1",
  "pennywise_transactions_v1",
  "pennywise_settings_v1",
];

export type SessionStatus = "resolving" | "authenticated" | "unauthenticated";

type State = {
  accessToken: string | null;
  user: MeResponse | null;
  sessionStatus: SessionStatus;
  unlocked: boolean;
  onboardingCompleted: boolean;

  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, currencyCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: MeResponse) => void;
  setUnlocked: (v: boolean) => void;
  completeOnboarding: () => void;
  hydrateAccessToken: () => Promise<void>;
  validateSession: () => Promise<void>;
};

type PersistedState = Pick<State, "user" | "unlocked" | "onboardingCompleted">;

let logoutInFlight: Promise<void> | null = null;

function syncDefaultCurrency(user: MeResponse) {
  const currency = user.defaultCurrencyCode as CurrencyCode | null;
  if (currency && ["USD", "EUR", "GBP", "JPY", "INR"].includes(currency)) {
    useSettingsStore.getState().setPrimaryCurrency(currency);
  }
}

async function clearAccountState() {
  const [
    { useBooksStore },
    { useCategoriesStore },
    { useBudgetsStore },
    { useTransactionsStore },
    { useSettingsStore },
    { useAddTransactionDraftStore },
    { useOnboardingStore },
    { useUndoToastStore },
  ] = await Promise.all([
    import("@/features/books/store"),
    import("@/features/categories/store"),
    import("@/features/budgets/store"),
    import("@/features/transactions/store"),
    import("@/features/settings/store"),
    import("@/features/transactions/addDraftStore"),
    import("@/features/onboarding/useOnboardingStore"),
    import("@/shared/ui/state/useUndoToastStore"),
  ]);

  // Supersede and await any automatic hydration still in flight. Otherwise a
  // stale AsyncStorage read could finish after these resets and repopulate the
  // previous account in memory.
  await Promise.all([
    Promise.resolve(useBooksStore.persist.rehydrate()),
    Promise.resolve(useCategoriesStore.persist.rehydrate()),
    Promise.resolve(useBudgetsStore.persist.rehydrate()),
    Promise.resolve(useTransactionsStore.persist.rehydrate()),
    Promise.resolve(useSettingsStore.persist.rehydrate()),
  ]);

  useBooksStore.setState({
    books: [],
    selectedBookId: "",
    isLoading: false,
    error: null,
  });
  useCategoriesStore.setState({
    categories: [],
    isLoading: false,
    error: null,
    lastCreatedCategoryId: null,
  });
  useBudgetsStore.setState({
    budgets: [],
    isLoading: false,
    error: null,
  });
  useTransactionsStore.setState({
    transactions: [],
    isLoading: false,
    error: null,
  });
  useSettingsStore.setState({ primaryCurrency: "USD" });

  // These stores are not persisted, but may still contain data from the
  // previous account for the lifetime of the running app.
  useAddTransactionDraftStore.getState().reset();
  useOnboardingStore.setState({ currency: null });
  useUndoToastStore.getState().hide();
}

export const useAuthStore = create<State>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      sessionStatus: "resolving",
      unlocked: false,
      onboardingCompleted: false,

      login: async (email, password) => {
        const res = await authApi.login(email.trim().toLowerCase(), password);
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, res.accessToken);
        syncDefaultCurrency(res.user);
        set({
          accessToken: res.accessToken,
          user: res.user,
          sessionStatus: "authenticated",
          unlocked: true,
        });
      },

      signup: async (email, password, currencyCode) => {
        const res = await authApi.signup(email.trim().toLowerCase(), password, currencyCode);
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, res.accessToken);
        syncDefaultCurrency(res.user);
        set({
          accessToken: res.accessToken,
          user: res.user,
          sessionStatus: "authenticated",
          unlocked: true,
        });
      },

      logout: async () => {
        if (logoutInFlight) return logoutInFlight;

        logoutInFlight = (async () => {
          bumpAccountEpoch();
          set({
            accessToken: null,
            user: null,
            sessionStatus: "resolving",
            unlocked: false,
            onboardingCompleted: false,
          });

          let cleanupError: unknown = null;

          try {
            await clearAccountState();
          } catch (error) {
            cleanupError = error;
          }
          try {
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
          } catch (error) {
            cleanupError ??= error;
          }

          // Store resets above intentionally update memory first. Removing the
          // backing keys last prevents any queued persistence write from
          // restoring another user's cached data.
          set({ sessionStatus: "unauthenticated" });
          await Promise.resolve();
          try {
            await AsyncStorage.multiRemove(ACCOUNT_STORAGE_KEYS);
          } catch (error) {
            cleanupError ??= error;
          }

          if (cleanupError) throw cleanupError;
        })().finally(() => {
          logoutInFlight = null;
        });

        return logoutInFlight;
      },

      setUser: (user) => set({ user }),
      setUnlocked: (v) => set({ unlocked: v }),
      completeOnboarding: () => set({ onboardingCompleted: true, unlocked: true }),

      hydrateAccessToken: async () => {
        const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        set({ accessToken });
      },

      validateSession: async () => {
        const accessToken = useAuthStore.getState().accessToken;
        if (!accessToken) {
          await useAuthStore.getState().logout();
          return;
        }

        set({ sessionStatus: "resolving" });
        try {
          const user = await authApi.getMe();
          syncDefaultCurrency(user);
          set({
            accessToken,
            user,
            sessionStatus: "authenticated",
            unlocked: true,
          });
        } catch {
          if (useAuthStore.getState().sessionStatus !== "unauthenticated") {
            await useAuthStore.getState().logout();
          }
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): PersistedState => ({
        user: s.user,
        unlocked: s.unlocked,
        onboardingCompleted: s.onboardingCompleted,
      }),
      migrate: async (persisted: any) => {
        const user =
          persisted?.user ??
          (persisted?.userEmail
            ? {
                id: "legacy-local-user",
                email: String(persisted.userEmail),
                defaultCurrencyCode: "USD",
                createdAt: new Date().toISOString(),
              }
            : null);

        return {
          user,
          unlocked: Boolean(persisted?.unlocked),
          onboardingCompleted: Boolean(persisted?.onboardingCompleted),
        } as PersistedState;
      },
    }
  )
);
