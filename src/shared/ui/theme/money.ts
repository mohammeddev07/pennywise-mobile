import { tokens } from "@/shared/ui/theme/tokens";

export type MoneyKind = "INCOME" | "EXPENSE" | "income" | "expense";

/**
 * Single source of truth for money color across the app.
 *
 * Income is green and expense is red everywhere a signed amount is shown:
 * lists, detail, totals, the add flow. Routing every call site through here is
 * deliberate - the red-expense decision diverges from the reference mocks
 * (which keep expenses neutral so red reads as an alert), so keeping it in one
 * function means the whole app can be re-tuned by editing this file alone.
 */
export function amountColor(kind: MoneyKind) {
  const isIncome = kind === "INCOME" || kind === "income";
  return isIncome ? tokens.semantic.income : tokens.semantic.expense;
}

/** Tint behind a money value (status pills, icon tiles). */
export function amountSoftColor(kind: MoneyKind) {
  const isIncome = kind === "INCOME" || kind === "income";
  return isIncome ? tokens.colors.greenSoft : tokens.colors.redSoft;
}

/**
 * Color for a net/balance figure, which is neutral when positive and red when
 * negative. A balance is not an income/expense, so it does not use
 * `amountColor`: green on every positive balance would be noise.
 */
export function balanceColor(amountMinor: number) {
  return amountMinor < 0 ? tokens.semantic.expense : tokens.semantic.text;
}
