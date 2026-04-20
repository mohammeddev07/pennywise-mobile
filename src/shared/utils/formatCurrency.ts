import type { CurrencyCode } from "@/shared/types/models";

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
};

export function currencySymbol(currency: CurrencyCode) {
  return SYMBOLS[currency] ?? currency;
}

export function formatCurrency(amountCents: number, currency: CurrencyCode, maximumFractionDigits = 2) {
  const amount = amountCents / 100;

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

export function formatSignedCurrency(amountCents: number, currency: CurrencyCode, maximumFractionDigits = 2) {
  const formatted = formatCurrency(Math.abs(amountCents), currency, maximumFractionDigits);
  if (amountCents === 0) return formatted;
  return `${amountCents > 0 ? "+" : "-"}${formatted}`;
}
