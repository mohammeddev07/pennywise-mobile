import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import * as transactionsApi from "@/shared/api/transactions";
import type {
  PaymentMethod,
  TransactionCreatePayload,
  TransactionListParams,
  TransactionResponse,
  TransactionType,
  TransactionUpdatePayload,
} from "@/shared/types/api";
import type { Transaction } from "@/shared/types/models";

export type { Transaction, TransactionType, PaymentMethod };

export type TransactionKind = TransactionType;

export type NewTransaction = TransactionCreatePayload & {
  id?: string;
  bookId: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  occurredOn?: string;
  categoryName?: string;
};

export type TransactionPatch = TransactionUpdatePayload;

type PersistedShapeV5 = {
  transactions: Transaction[];
};

type State = {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;

  loadTransactions: (bookId: string, params?: TransactionListParams) => Promise<void>;
  addTransaction: (tx: Transaction | TransactionResponse) => string;
  updateTransaction: (id: string, patch: TransactionPatch) => Promise<boolean>;
  removeTransaction: (id: string) => Promise<void>;
  clearTransactions: () => void;

  insertTransaction: (tx: Transaction, index?: number) => void;
  duplicateTransaction: (id: string) => Promise<string | null>;
  renameTransactionCategory: (oldName: string, newName: string) => void;
};

const PAYMENT_SET: PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "WALLET", "OTHER"];

export function isPaymentMethod(x: any): x is PaymentMethod {
  return typeof x === "string" && (PAYMENT_SET as string[]).includes(x);
}

export function normalizePaymentMethod(input: any): PaymentMethod {
  if (isPaymentMethod(input)) return input;
  const s = String(input ?? "").toUpperCase().replace(/[\s-]+/g, "_");
  if (s === "BANK") return "BANK_TRANSFER";
  if (s === "CREDIT" || s === "DEBIT") return "CARD";
  if (isPaymentMethod(s)) return s;
  return "CASH";
}

export function normalizeTransactionType(input: any): TransactionType {
  const s = String(input ?? "").toUpperCase();
  return s === "INCOME" ? "INCOME" : "EXPENSE";
}

export function normalizeAmountMinor(input: any, fallback = 0) {
  const n = Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(Math.abs(n)));
}

function occurredOnFrom(occurredAt?: string) {
  const d = occurredAt ? new Date(occurredAt) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function makeLegacyId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function mapTransactionResponse(input: TransactionResponse | any): Transaction {
  const now = new Date().toISOString();
  const occurredAt = String(input.occurredAt ?? input.createdAt ?? now);
  const categoryName = String(input.categoryName ?? input.category?.name ?? input.category ?? "Uncategorized").trim() || "Uncategorized";

  return {
    id: String(input.id ?? makeLegacyId()),
    bookId: String(input.bookId ?? ""),
    type: normalizeTransactionType(input.type ?? input.kind),
    amountMinor: normalizeAmountMinor(input.amountMinor ?? input.amountCents),
    categoryId: String(input.categoryId ?? input.category?.id ?? `legacy:${categoryName}`),
    categoryName,
    title: String(input.title ?? input.name ?? "").trim() || categoryName,
    note: typeof input.note === "string" && input.note.trim() ? input.note.trim() : undefined,
    paymentMethod: normalizePaymentMethod(input.paymentMethod),
    occurredAt,
    occurredOn: String(input.occurredOn ?? occurredOnFrom(occurredAt)),
    version: Number(input.version ?? 0) || 0,
    createdAt: String(input.createdAt ?? occurredAt),
    updatedAt: String(input.updatedAt ?? input.createdAt ?? occurredAt),
  };
}

function toCreatePayload(tx: Transaction): TransactionCreatePayload {
  return {
    type: tx.type,
    amountMinor: tx.amountMinor,
    categoryId: tx.categoryId,
    title: tx.title,
    note: tx.note,
    paymentMethod: tx.paymentMethod,
    occurredAt: tx.occurredAt,
  };
}

function randomIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export const useTransactionsStore = create<State>()(
  persist(
    (set, get) => ({
      transactions: [],
      isLoading: false,
      error: null,

      loadTransactions: async (bookId, params) => {
        if (!bookId) return;
        set({ isLoading: true, error: null });
        try {
          const res = await transactionsApi.listTransactions(bookId, params);
          const next = res.page.items.map(mapTransactionResponse);
          set((s) => ({
            transactions: [...s.transactions.filter((tx) => tx.bookId !== bookId), ...next],
            isLoading: false,
            error: null,
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Could not load transactions";
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      addTransaction: (input) => {
        const tx = mapTransactionResponse(input);
        set((s) => ({ transactions: [tx, ...s.transactions.filter((item) => item.id !== tx.id)] }));
        return tx.id;
      },

      updateTransaction: async (id, patch) => {
        const current = get().transactions.find((tx) => tx.id === id);
        if (!current) return false;
        const next = mapTransactionResponse(
          await transactionsApi.patchTransaction(current.bookId, current.id, current.version, patch)
        );
        set((s) => ({ transactions: s.transactions.map((tx) => (tx.id === id ? next : tx)) }));
        return true;
      },

      removeTransaction: async (id) => {
        const current = get().transactions.find((tx) => tx.id === id);
        if (!current) return;
        await transactionsApi.deleteTransaction(current.bookId, current.id, current.version);
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
      },

      clearTransactions: () => set({ transactions: [] }),

      insertTransaction: (tx, index = 0) => {
        set((s) => {
          const next = s.transactions.filter((item) => item.id !== tx.id);
          const i = Math.max(0, Math.min(next.length, index));
          next.splice(i, 0, tx);
          return { transactions: next };
        });
      },

      duplicateTransaction: async (id) => {
        const found = get().transactions.find((t) => t.id === id);
        if (!found) return null;
        const tx = mapTransactionResponse(
          await transactionsApi.createTransaction(found.bookId, randomIdempotencyKey(), {
            ...toCreatePayload(found),
            occurredAt: new Date().toISOString(),
          })
        );
        set((s) => ({ transactions: [tx, ...s.transactions] }));
        return tx.id;
      },

      renameTransactionCategory: (oldName, newName) => {
        const from = oldName.trim();
        const to = newName.trim() || "Uncategorized";
        if (!from || from === to) return;
        set((s) => ({
          transactions: s.transactions.map((tx) =>
            tx.categoryName === from
              ? {
                  ...tx,
                  categoryName: to,
                  title: tx.title === from ? to : tx.title,
                }
              : tx
          ),
        }));
      },
    }),
    {
      name: "pennywise_transactions_v1",
      version: 5,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ transactions: s.transactions }),
      migrate: async (persisted: any) => {
        if (!persisted) return { transactions: [] } as PersistedShapeV5;
        const txs: any[] = Array.isArray(persisted.transactions) ? persisted.transactions : [];
        const migrated = txs.map(mapTransactionResponse);
        return { transactions: migrated } as PersistedShapeV5;
      },
    }
  )
);
