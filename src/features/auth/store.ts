import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ACCESS_TOKEN_KEY } from "@/shared/api/client";
import * as authApi from "@/shared/api/auth";
import type { MeResponse } from "@/shared/types/api";

type State = {
  accessToken: string | null;
  user: MeResponse | null;
  unlocked: boolean;
  onboardingCompleted: boolean;

  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, currencyCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUnlocked: (v: boolean) => void;
  completeOnboarding: () => void;
  hydrateAccessToken: () => Promise<void>;
};

type PersistedState = Pick<State, "user" | "unlocked" | "onboardingCompleted">;

export const useAuthStore = create<State>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      unlocked: false,
      onboardingCompleted: false,

      login: async (email, password) => {
        const res = await authApi.login(email.trim().toLowerCase(), password);
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, res.accessToken);
        set({ accessToken: res.accessToken, user: res.user, unlocked: true });
      },

      signup: async (email, password, currencyCode) => {
        const res = await authApi.signup(email.trim().toLowerCase(), password, currencyCode);
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, res.accessToken);
        set({ accessToken: res.accessToken, user: res.user, unlocked: true });
      },

      logout: async () => {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        set({
          accessToken: null,
          user: null,
          unlocked: false,
          onboardingCompleted: false,
        });
      },

      setUnlocked: (v) => set({ unlocked: v }),
      completeOnboarding: () => set({ onboardingCompleted: true, unlocked: true }),

      hydrateAccessToken: async () => {
        const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (accessToken) set({ accessToken });
        else set({ accessToken: null, user: null, unlocked: false });
      },
    }),
    {
      name: "pennywise_demo_auth_v1",
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
