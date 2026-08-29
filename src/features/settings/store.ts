import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CurrencyCode } from "@/shared/types/models";

/**
 * Account-level currency fallback ONLY.
 *
 * The currency a user actually sees is `book.currencyCode`, picked once during
 * onboarding and fixed for the life of that book (see `useBookCurrency`).
 * This value exists so onboarding has something to seed the first book with,
 * and so a frame rendered before books hydrate has a sane placeholder. It is
 * deliberately not user-editable after setup - a live switch here would leave
 * every stored `amountMinor` reinterpreted in the wrong currency.
 */
type State = {
  primaryCurrency: CurrencyCode;
  setPrimaryCurrency: (c: CurrencyCode) => void;
};

export const useSettingsStore = create<State>()(
  persist(
    (set) => ({
      primaryCurrency: "USD",
      setPrimaryCurrency: (c) => set({ primaryCurrency: c }),
    }),
    {
      name: "pennywise_settings_v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: async (persisted: any) => {
        // v1 stored { primaryCurrency: string }. Keep it migration-safe.
        const c = String(persisted?.primaryCurrency ?? "USD") as CurrencyCode;
        const allowed: CurrencyCode[] = ["USD", "EUR", "GBP", "JPY", "INR"];
        return { primaryCurrency: allowed.includes(c) ? c : "USD" } as State;
      },
    }
  )
);

export type { CurrencyCode };
