import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type Budget = {
  bookId: string;
  category: string; // matches transaction.category string
  budgetCents: number;
};

type State = {
  budgets: Budget[];
  setBudget: (b: Budget) => void;
  removeBudget: (bookId: string, category: string) => void;
  getBudgetCents: (bookId: string, category: string) => number | null;
};

export const useBudgetsStore = create<State>()(
  persist(
    (set, get) => ({
      budgets: [],

      setBudget: (b) =>
        set((s) => {
          const next = s.budgets.filter((x) => !(x.bookId === b.bookId && x.category === b.category));
          next.unshift({ ...b, category: b.category.trim() || "Uncategorized" });
          return { budgets: next };
        }),

      removeBudget: (bookId, category) =>
        set((s) => ({
          budgets: s.budgets.filter((x) => !(x.bookId === bookId && x.category === category)),
        })),

      getBudgetCents: (bookId, category) => {
        const found = get().budgets.find((b) => b.bookId === bookId && b.category === category);
        return found ? found.budgetCents : null;
      },
    }),
    {
      name: "pennywise_budgets_v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (s) => ({ budgets: s.budgets }),
    }
  )
);
