import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Budget = {
  bookId: string;
  category: string; // matches transaction.category string
  budgetCents: number;
};

type State = {
  budgets: Budget[];
  setBudget: (b: Budget) => void;
  removeBudget: (bookId: string, category: string) => void;
  removeBudgetForCategory: (bookId: string, category: string) => void;
  renameBudgetCategory: (bookId: string, oldName: string, newName: string) => void;
  getBudgetCents: (bookId: string, category: string) => number | null;
};

function normalizeCategory(category: string) {
  return category.trim() || "Uncategorized";
}

function normalizeBudgetCents(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function collapseDuplicates(budgets: Budget[]) {
  const byKey = new Map<string, Budget>();
  for (const budget of budgets) {
    byKey.set(`${budget.bookId}::${budget.category}`, budget);
  }
  return Array.from(byKey.values());
}

export const useBudgetsStore = create<State>()(
  persist(
    (set, get) => ({
      budgets: [],

      setBudget: (b) =>
        set((s) => {
          const category = normalizeCategory(b.category);
          const next = s.budgets.filter((x) => !(x.bookId === b.bookId && x.category === category));
          next.unshift({ ...b, category, budgetCents: normalizeBudgetCents(b.budgetCents) });
          return { budgets: next };
        }),

      removeBudget: (bookId, category) =>
        set((s) => ({
          budgets: s.budgets.filter((x) => !(x.bookId === bookId && x.category === category)),
        })),

      removeBudgetForCategory: (bookId, category) =>
        set((s) => ({
          budgets: s.budgets.filter((x) => !(x.bookId === bookId && x.category === category)),
        })),

      renameBudgetCategory: (bookId, oldName, newName) => {
        const from = normalizeCategory(oldName);
        const to = normalizeCategory(newName);
        if (!from || from === to) return;

        set((s) => ({
          budgets: collapseDuplicates(
            s.budgets.map((b) => (b.bookId === bookId && b.category === from ? { ...b, category: to } : b))
          ),
        }));
      },

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
