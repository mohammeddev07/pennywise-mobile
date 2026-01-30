export type TransactionType = "INCOME" | "EXPENSE";

export type Book = {
  id: string;
  name: string;
  currencyCode: string;
  openingBalanceMinor: number;
};

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  isDisabled: boolean;
};

export type Transaction = {
  id: string;
  occurredOn: string; // YYYY-MM-DD
  type: TransactionType;
  amountMinor: number;
  category: { id: string; name: string };
  note?: string;
  merchantName?: string;
  createdAt: string; // ISO
};

export type Summary = {
  balanceMinor: number;
  monthIncomeMinor: number;
  monthExpenseMinor: number;
  monthNetMinor: number;
};

export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export type TransactionListResponse = {
  page: CursorPage<Transaction>;
};
