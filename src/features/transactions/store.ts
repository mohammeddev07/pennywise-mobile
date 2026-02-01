import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { useBooksStore } from "@/features/books/store";
import { useSettingsStore } from "@/features/settings/store";

export type TransactionKind = "income" | "expense";
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "wallet" | "other";

export type Transaction = {
  id: string;

  bookId: string;

  kind: TransactionKind;
  amountCents: number;
  currency: string;

  title: string; // primary label
  category: string;
  note?: string;

  paymentMethod: PaymentMethod;
  occurredAt: string; // ISO
  createdAt: string; // ISO
};

export type NewTransaction = {
  id?: string;
  bookId?: string;

  kind: TransactionKind;
  amountCents: number;

  currency?: string;

  title?: string;
  category?: string;
  note?: string;
  paymentMethod?: PaymentMethod;

  occurredAt?: string;
  createdAt?: string;
};


type PersistedShapeV3 = {
  transactions: Transaction[];
};

type State = {
  transactions: Transaction[];

  addTransaction: (tx: NewTransaction) => string;
  removeTransaction: (id: string) => void;
  clearTransactions: () => void;

  insertTransaction: (tx: Transaction, index?: number) => void;
  duplicateTransaction: (id: string) => string | null;
};

function makeId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function clampIndex(i: number, len: number) {
  return Math.max(0, Math.min(len, i));
}

function currentBookIdFallback() {
  const fromBooks = useBooksStore.getState().selectedBookId;
  return fromBooks || "personal";
}

function defaultCurrencyFallback() {
  const c = useSettingsStore.getState().primaryCurrency;
  return c || "USD";
}

export const useTransactionsStore = create<State>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (input) => {
        const now = new Date().toISOString();

        const tx: Transaction = {
          id: input.id ?? makeId(),
          createdAt: input.createdAt ?? now,
          occurredAt: input.occurredAt ?? now,

          bookId: input.bookId ?? currentBookIdFallback(),

          kind: input.kind,
          amountCents: input.amountCents,
          currency: input.currency ?? defaultCurrencyFallback(),

          title: (input.title ?? "").trim(),

          category: (input.category ?? "Uncategorized").trim() || "Uncategorized",
          note: input.note?.trim() ? input.note.trim() : undefined,

          paymentMethod: input.paymentMethod ?? "cash",
        };

        set((s) => ({ transactions: [tx, ...s.transactions] }));
        return tx.id;
      },

      removeTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        })),

      clearTransactions: () => set({ transactions: [] }),

      insertTransaction: (tx, index = 0) => {
        set((s) => {
          const next = [...s.transactions];
          const i = clampIndex(index, next.length);
          next.splice(i, 0, tx);
          return { transactions: next };
        });
      },

      duplicateTransaction: (id) => {
        const found = get().transactions.find((t) => t.id === id);
        if (!found) return null;

        const now = new Date().toISOString();
        const next: Transaction = {
          ...found,
          id: makeId(),
          createdAt: now,
          occurredAt: now,
          bookId: found.bookId ?? currentBookIdFallback(),
        };

        set((s) => ({ transactions: [next, ...s.transactions] }));
        return next.id;
      },
    }),
    {
      name: "pennywise_transactions_v1",
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ transactions: s.transactions }),
      migrate: async (persisted: any) => {
        if (!persisted) return { transactions: [] } as PersistedShapeV3;

        const txs: any[] = Array.isArray(persisted.transactions) ? persisted.transactions : [];
        const now = new Date().toISOString();

        const migrated: Transaction[] = txs.map((t) => {
          const paymentMethod =
            t.paymentMethod === "card" ||
            t.paymentMethod === "bank_transfer" ||
            t.paymentMethod === "wallet" ||
            t.paymentMethod === "other"
              ? (t.paymentMethod as PaymentMethod)
              : "cash";

          return {
            id: String(t.id ?? makeId()),
            bookId: String(t.bookId ?? "personal"),

            kind: t.kind === "income" ? "income" : "expense",
            amountCents: Number.isFinite(t.amountCents) ? t.amountCents : 0,
            currency: String(t.currency ?? "USD"),

            title: String(t.title ?? t.name ?? "").trim(),

            category: String(t.category ?? "Uncategorized"),
            note: typeof t.note === "string" && t.note.trim() ? t.note.trim() : undefined,

            paymentMethod,

            occurredAt: String(t.occurredAt ?? t.createdAt ?? now),
            createdAt: String(t.createdAt ?? t.occurredAt ?? now),
          };
        });

        return { transactions: migrated } as PersistedShapeV3;
      },
    }
  )
);
