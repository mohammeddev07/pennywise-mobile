export type BookId = string;

export type Book = {
  id: BookId;
  name: string;
  subtitle?: string;
};

/**
 * Canonical currency codes used across the app.
 * Keep this aligned with onboarding currency selection + settings.
 */
export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "INR";

export type TransactionKind = "income" | "expense";

/**
 * Canonical payment methods used for persistence + UI labels.
 * Stored in lowercase for compactness and easy mapping to UI.
 */
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "wallet" | "other";

export type Transaction = {
  id: string;

  bookId: BookId;

  kind: TransactionKind;
  amountCents: number;
  currency: CurrencyCode;

  /** Primary label shown in lists (what the user remembers). */
  title: string;
  category: string;
  note?: string;

  paymentMethod: PaymentMethod;

  /** User-selected time of transaction (ISO). */
  occurredAt: string;

  /** System write time (ISO). */
  createdAt: string;
};
