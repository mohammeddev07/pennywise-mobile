import type { Book, Category, Summary, Transaction, TransactionListResponse, TransactionType } from "../types/dto";
import { sleep } from "../utils/sleep";
import { MOCK_BOOKS } from "../mocks/book";
import { MOCK_CATEGORIES } from "../mocks/categories";
import { MOCK_SUMMARY } from "../mocks/summaries";
import { MOCK_TRANSACTIONS } from "../mocks/transactions";

let books: Book[] = [...MOCK_BOOKS];
let categories: Category[] = [...MOCK_CATEGORIES];
let summaryByBook: Record<string, Summary> = {
  [MOCK_BOOKS[0].id]: { ...MOCK_SUMMARY }
};
let transactionsByBook: Record<string, Transaction[]> = {
  [MOCK_BOOKS[0].id]: [...MOCK_TRANSACTIONS]
};

function recomputeSummary(bookId: string) {
  const txs = transactionsByBook[bookId] ?? [];
  const income = txs.filter((t) => t.type === "INCOME").reduce((a, t) => a + t.amountMinor, 0);
  const expense = txs.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + t.amountMinor, 0);
  const net = income - expense;

  // Keep the hero card stable like the screenshot; compute balance on top of opening (0 for now)
  const balance = 1245000; // UI-first: keep screenshot value; swap to computed later
  summaryByBook[bookId] = {
    balanceMinor: balance,
    monthIncomeMinor: income,
    monthExpenseMinor: expense,
    monthNetMinor: net
  };
}

export async function listBooks(): Promise<{ items: Book[] }> {
  await sleep(250);
  return { items: books };
}

export async function listCategories(bookId: string): Promise<{ items: Category[] }> {
  await sleep(250);
  void bookId;
  return { items: categories.filter((c) => !c.isDisabled) };
}

export async function getSummary(bookId: string): Promise<Summary> {
  await sleep(280);
  recomputeSummary(bookId);
  return summaryByBook[bookId] ?? { ...MOCK_SUMMARY };
}

export async function listTransactions(bookId: string): Promise<TransactionListResponse> {
  await sleep(350);
  const items = (transactionsByBook[bookId] ?? [])
    .slice()
    .sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : -1));

  return { page: { items, nextCursor: null } };
}

export async function createTransaction(args: {
  bookId: string;
  type: TransactionType;
  amountMinor: number;
  occurredOn: string;
  categoryId: string;
  note?: string;
  merchantName?: string;
}): Promise<Transaction> {
  await sleep(250);

  const cat = categories.find((c) => c.id === args.categoryId);
  const tx: Transaction = {
    id: `t_${Date.now()}`,
    occurredOn: args.occurredOn,
    type: args.type,
    amountMinor: args.amountMinor,
    category: { id: args.categoryId, name: cat?.name ?? "Category" },
    note: args.note,
    merchantName: args.merchantName,
    createdAt: new Date().toISOString()
  };

  transactionsByBook[args.bookId] = [tx, ...(transactionsByBook[args.bookId] ?? [])];
  recomputeSummary(args.bookId);
  return tx;
}

export async function updateTransaction(args: {
  bookId: string;
  txId: string;
  patch: Partial<Pick<Transaction, "type" | "amountMinor" | "occurredOn" | "note" | "merchantName">> & { categoryId?: string };
}): Promise<Transaction> {
  await sleep(250);

  const list = transactionsByBook[args.bookId] ?? [];
  const idx = list.findIndex((t) => t.id === args.txId);
  if (idx < 0) throw new Error("Not found");

  const prev = list[idx];
  const nextCat =
    args.patch.categoryId
      ? categories.find((c) => c.id === args.patch.categoryId)
      : undefined;

  const next: Transaction = {
    ...prev,
    ...args.patch,
    category: args.patch.categoryId
      ? { id: args.patch.categoryId, name: nextCat?.name ?? prev.category.name }
      : prev.category
  };

  list[idx] = next;
  transactionsByBook[args.bookId] = list;
  recomputeSummary(args.bookId);

  return next;
}

export async function deleteTransaction(args: { bookId: string; txId: string }): Promise<void> {
  await sleep(200);
  const list = transactionsByBook[args.bookId] ?? [];
  transactionsByBook[args.bookId] = list.filter((t) => t.id !== args.txId);
  recomputeSummary(args.bookId);
}
