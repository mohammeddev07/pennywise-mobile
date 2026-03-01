import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { useBooksStore } from "@/features/books/store";
import { useSettingsStore } from "@/features/settings/store";
import type { CurrencyCode, PaymentMethod, Transaction, TransactionKind } from "@/shared/types/models";

export type { Transaction, TransactionKind, PaymentMethod };

export type NewTransaction = {
  id?: string;
  bookId?: string;

  kind: TransactionKind;
  amountCents: number;

  currency?: CurrencyCode;

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

function defaultCurrencyFallback(): CurrencyCode {
  const c = useSettingsStore.getState().primaryCurrency;
  return c || "USD";
}

const CURRENCY_SET: CurrencyCode[] = ["USD", "EUR", "GBP", "JPY", "INR"];
export function isCurrencyCode(x: any): x is CurrencyCode {
  return typeof x === "string" && (CURRENCY_SET as string[]).includes(x);
}

const PAYMENT_SET: PaymentMethod[] = ["cash", "card", "bank_transfer", "wallet", "other"];
export function isPaymentMethod(x: any): x is PaymentMethod {
  return typeof x === "string" && (PAYMENT_SET as string[]).includes(x);
}

export function normalizePaymentMethod(input: any): PaymentMethod {
  if (isPaymentMethod(input)) return input;
  // allow common UI labels
  const s = String(input ?? "").toLowerCase();
  if (s === "bank transfer" || s === "bank_transfer" || s === "bank") return "bank_transfer";
  if (s === "wallet") return "wallet";
  if (s === "card" || s === "credit" || s === "debit") return "card";
  if (s === "other") return "other";
  return "cash";
}

export const useTransactionsStore = create<State>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (input) => {
        const now = new Date().toISOString();

        const title = (input.title ?? "").trim();
        const category = (input.category ?? "Uncategorized").trim() || "Uncategorized";
        const note = input.note?.trim() ? input.note.trim() : undefined;

        const currency = isCurrencyCode(input.currency) ? input.currency : defaultCurrencyFallback();

        const tx: Transaction = {
          id: input.id ?? makeId(),
          createdAt: input.createdAt ?? now,
          occurredAt: input.occurredAt ?? now,

          bookId: input.bookId ?? currentBookIdFallback(),

          kind: input.kind,
          amountCents: input.amountCents,
          currency,

          title: title.length ? title : category,
          category,
          note,

          paymentMethod: normalizePaymentMethod(input.paymentMethod),
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
          currency: isCurrencyCode(found.currency) ? found.currency : defaultCurrencyFallback(),
          paymentMethod: normalizePaymentMethod(found.paymentMethod),
        };

        set((s) => ({ transactions: [next, ...s.transactions] }));
        return next.id;
      },
    }),
    {
      name: "pennywise_transactions_v1",
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ transactions: s.transactions }),
      migrate: async (persisted: any) => {
        if (!persisted) return { transactions: [] } as PersistedShapeV3;

        const txs: any[] = Array.isArray(persisted.transactions) ? persisted.transactions : [];
        const now = new Date().toISOString();

        const migrated: Transaction[] = txs.map((t) => {
          const kind: TransactionKind = t.kind === "income" ? "income" : "expense";

          const currency: CurrencyCode = isCurrencyCode(t.currency)
            ? t.currency
            : isCurrencyCode(t.currencyCode)
              ? t.currencyCode
              : defaultCurrencyFallback();

          const category = String(t.category ?? t.categoryName ?? "Uncategorized").trim() || "Uncategorized";
          const title = String(t.title ?? t.name ?? "").trim() || category;

          return {
            id: String(t.id ?? makeId()),
            bookId: String(t.bookId ?? "personal"),

            kind,
            amountCents: Number.isFinite(t.amountCents)
              ? Number(t.amountCents)
              : Number.isFinite(t.amountMinor)
                ? Number(t.amountMinor)
                : 0,
            currency,

            title,
            category,
            note: typeof t.note === "string" && t.note.trim() ? t.note.trim() : undefined,

            paymentMethod: normalizePaymentMethod(t.paymentMethod),

            occurredAt: String(t.occurredAt ?? t.transactionDateISO ?? t.createdAt ?? now),
            createdAt: String(t.createdAt ?? t.occurredAt ?? now),
          };
        });

        return { transactions: migrated } as PersistedShapeV3;
      },
    }
  )
);
