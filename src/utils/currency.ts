export function formatMoneyFromMinor(amountMinor: number, currencyCode: string) {
  const amount = amountMinor / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(amount);
}
