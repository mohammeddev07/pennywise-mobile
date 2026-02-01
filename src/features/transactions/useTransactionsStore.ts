import { create } from "zustand";
import type { Transaction } from "@/shared/types/models";

type TxState = {
  transactions: Transaction[];
};

const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

const MOCK: Transaction[] = [
  {
    id: "t1",
    type: "expense",
    amountCents: 1299,
    category: "Coffee",
    paymentMethod: "Card",
    transactionDateISO: iso(1000 * 60 * 12),
    note: "Latte",
  },
  {
    id: "t2",
    type: "expense",
    amountCents: 4599,
    category: "Groceries",
    paymentMethod: "Card",
    transactionDateISO: iso(1000 * 60 * 60 * 3),
  },
  {
    id: "t3",
    type: "income",
    amountCents: 250000,
    category: "Salary",
    paymentMethod: "Bank Transfer",
    transactionDateISO: iso(1000 * 60 * 60 * 24 * 2),
  },
  {
    id: "t4",
    type: "expense",
    amountCents: 8999,
    category: "Dining",
    paymentMethod: "Card",
    transactionDateISO: iso(1000 * 60 * 60 * 24 * 4),
  },
  {
    id: "t5",
    type: "expense",
    amountCents: 1999,
    category: "Transport",
    paymentMethod: "Wallet",
    transactionDateISO: iso(1000 * 60 * 60 * 24 * 6),
  },
];

export const useTransactionsStore = create<TxState>(() => ({
  transactions: MOCK,
}));
