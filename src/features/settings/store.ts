import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "INR";

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
      version: 1,
    }
  )
);
