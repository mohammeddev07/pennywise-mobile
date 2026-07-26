export type BookId = string;

export type Book = {
  id: BookId;
  name: string;
  currencyCode: string;
  timezone: string;
  openingBalanceMinor: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Canonical currency codes used across the app.
 * Keep this aligned with onboarding currency selection + settings.
 */
export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "INR";

export type TransactionKind = "INCOME" | "EXPENSE";
export type TransactionType = TransactionKind;

/**
 * Canonical payment methods used for persistence + UI labels.
 */
export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "WALLET" | "OTHER";

export type Category = {
  id: string;
  bookId: string;
  type: TransactionType;
  name: string;
  icon: string;
  color: string;
  isDisabled: boolean;
  version: number;
  createdAt: string;
};

export type Transaction = {
  id: string;

  bookId: BookId;

  type: TransactionType;
  amountMinor: number;

  /** Primary label shown in lists (what the user remembers). */
  title: string;
  categoryId: string;
  categoryName: string;
  note?: string;

  paymentMethod: PaymentMethod;

  /** User-selected time of transaction (ISO). */
  occurredAt: string;
  occurredOn: string;

  /** System write time (ISO). */
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type Budget = {
  id: string;
  bookId: string;
  categoryId: string;
  categoryName: string;
  month: string;
  amountMinor: number;
  spentMinor: number;
  remainingMinor: number;
  currencyCode: string;
  version: number;
};
