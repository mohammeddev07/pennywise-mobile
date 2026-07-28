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

export function currencyMinorUnitDigits(currency: CurrencyInput) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return currency === "JPY" ? 0 : 2;
  }
}

export function minorToMajor(amountMinor: number, currency: CurrencyInput) {
  return amountMinor / 10 ** currencyMinorUnitDigits(currency);
}

export function majorToMinor(amount: number, currency: CurrencyInput) {
  return Math.round(amount * 10 ** currencyMinorUnitDigits(currency));
}

export function formatCurrency(amountMinor: number, currency: CurrencyInput, maximumFractionDigits?: number) {
  const amount = minorToMajor(amountMinor, currency);
  const displayDigits = maximumFractionDigits ?? currencyMinorUnitDigits(currency);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: displayDigits,
      maximumFractionDigits: displayDigits,
    }).format(amount);
  } catch {
    // Fallback (very simple)
    const sign = amount < 0 ? "-" : "";
    const abs = Math.abs(amount).toFixed(displayDigits);
    return `${sign}${currency} ${abs}`;
  }
}

export function formatSignedCurrency(amountMinor: number, currency: CurrencyInput, maximumFractionDigits?: number) {
  const formatted = formatCurrency(Math.abs(amountMinor), currency, maximumFractionDigits);
  if (amountMinor === 0) return formatted;
  return `${amountMinor > 0 ? "+" : "-"}${formatted}`;
}
