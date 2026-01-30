export type BookId = string;

export type Book = {
  id: BookId;
  name: string;
  subtitle?: string;
};

export type CurrencyCode = "USD" | "EUR" | "GBP" | "SAR" | "AED";

export type TransactionType = "income" | "expense";
export type PaymentMethod = "Cash" | "Card" | "Bank Transfer" | "Wallet" | "Other";

export type Transaction = {
  id: string;
  type: TransactionType;
  amountCents: number;
  category: string;
  paymentMethod: PaymentMethod;
  transactionDateISO: string; // ISO string
  note?: string;
};
