import type { CurrencyCode } from "@/shared/types/models";

export type CurrencyInput = CurrencyCode | string;

const SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
};

export function currencySymbol(currency: CurrencyInput) {
  return SYMBOLS[currency] ?? currency;
}

export function formatCurrency(amountMinor: number, currency: CurrencyInput, maximumFractionDigits = 2) {
  const amount = amountMinor / 100;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: maximumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  } catch {
    // Fallback (very simple)
    const sign = amount < 0 ? "-" : "";
    const abs = Math.abs(amount).toFixed(maximumFractionDigits);
    return `${sign}${currency} ${abs}`;
  }
}

export function formatSignedCurrency(amountMinor: number, currency: CurrencyInput, maximumFractionDigits = 2) {
  const formatted = formatCurrency(Math.abs(amountMinor), currency, maximumFractionDigits);
  if (amountMinor === 0) return formatted;
  return `${amountMinor > 0 ? "+" : "-"}${formatted}`;
}
