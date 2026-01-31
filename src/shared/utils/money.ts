export function parseMoneyToCents(input: string): number {
  // Keep digits + dot only
  const cleaned = (input ?? "").toString().replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function formatCents(cents: number) {
  const safe = Number.isFinite(cents) ? cents : 0;
  const abs = Math.abs(safe);

  const fixed = (abs / 100).toFixed(2);
  const [i, d] = fixed.split(".");
  const intWithSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return {
    intWithSep,
    dec: d,
    isNegative: safe < 0,
  };
}
