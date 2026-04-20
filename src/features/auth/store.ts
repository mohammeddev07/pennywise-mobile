import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type State = {
  userEmail: string | null;
  pendingEmail: string | null;
  unlocked: boolean;
  onboardingCompleted: boolean;

  setPendingEmail: (email: string) => void;
  unlockDemo: () => void;
  completeOnboarding: () => void;
  lockDemo: () => void;
  restartDemo: () => void;
};

export const DEMO_PIN = "1234";

export const useAuthStore = create<State>()(
  persist(
    (set, get) => ({
      userEmail: null,
      pendingEmail: null,
      unlocked: false,
      onboardingCompleted: false,

      setPendingEmail: (email) => set({ pendingEmail: email.trim().toLowerCase() }),
      unlockDemo: () => {
        const pending = get().pendingEmail;
        set({
          userEmail: pending || get().userEmail || "demo@pennywise.local",
          pendingEmail: null,
          unlocked: true,
        });
      },
      completeOnboarding: () => set({ onboardingCompleted: true, unlocked: true }),
      lockDemo: () => set({ unlocked: false, pendingEmail: null }),
      restartDemo: () =>
        set({
          userEmail: null,
          pendingEmail: null,
          unlocked: false,
          onboardingCompleted: false,
        }),
    }),
    {
      name: "pennywise_demo_auth_v1",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        userEmail: s.userEmail,
        unlocked: s.unlocked,
        onboardingCompleted: s.onboardingCompleted,
      }),
    }
  )
);
