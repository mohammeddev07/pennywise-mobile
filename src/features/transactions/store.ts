import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TransactionKind = "income" | "expense";
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "wallet" | "other";

export type Transaction = {
  id: string;
  kind: TransactionKind;
  amountCents: number;
  currency: string;
  category: string;
  note?: string;
  paymentMethod: PaymentMethod;
  occurredAt: string; // ISO
  createdAt: string; // ISO
};

// ✅ Make occurredAt optional for creation; store will default to now.
export type NewTransaction = Omit<Transaction, "id" | "createdAt" | "occurredAt"> & {
  id?: string;
  createdAt?: string;
  occurredAt?: string;
};

type State = {
  transactions: Transaction[];
  addTransaction: (tx: NewTransaction) => string;
  clearTransactions: () => void;
};

function makeId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useTransactionsStore = create<State>()(
  persist(
    (set) => ({
      transactions: [],

      addTransaction: (input) => {
        const now = new Date().toISOString();

        const tx: Transaction = {
          id: input.id ?? makeId(),
          createdAt: input.createdAt ?? now,
          occurredAt: input.occurredAt ?? now,

          kind: input.kind,
          amountCents: input.amountCents,
          currency: input.currency,
          category: input.category ?? "Uncategorized",
          note: input.note?.trim() ? input.note.trim() : undefined,
          paymentMethod: input.paymentMethod ?? "cash",
        };

        set((s) => ({ transactions: [tx, ...s.transactions] }));
        return tx.id;
      },

      clearTransactions: () => set({ transactions: [] }),
    }),
    {
      name: "pennywise_transactions_v1",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ transactions: s.transactions }),
    }
  )
);
