export type TransactionType = "income" | "expense";

export type Transaction = {
  id: string;
  type: TransactionType;
  amountCents: number;
  category: string;
  note?: string;
  createdAt: string; // ISO
};
