import type { CurrencyCode } from "@/shared/types/models";

export function formatCurrency(amountCents: number, currency: CurrencyCode) {
  const amount = amountCents / 100;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback (very simple)
    const sign = amount < 0 ? "-" : "";
    const abs = Math.abs(amount).toFixed(2);
    return `${sign}${currency} ${abs}`;
  }
}
