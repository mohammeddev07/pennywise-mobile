import React from "react";
import { View } from "react-native";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { OdometerAmount } from "@/shared/ui/components/OdometerAmount";
import type { Key as NumericKey } from "@/shared/ui/NumericKeypad";

function clampAmount(next: string) {
  if (!next.includes(".")) return next;
  const [a, b = ""] = next.split(".");
  return `${a}.${b.slice(0, 2)}`;
}

export function formatForTicker(raw: string, currencySymbol = "$") {
  const s = String(raw || "0");
  const hasDot = s.includes(".");
  const [intRaw, decRaw = ""] = s.split(".");

  const safeInt = (intRaw || "0").replace(/[^\d]/g, "") || "0";

  if (!hasDot) return `${currencySymbol}${safeInt}`;

  const d = (decRaw + "00").slice(0, 2);
  return `${currencySymbol}${safeInt}.${d}`;
}

/**
 * Helper to mutate an amount string based on NumericKeypad keys.
 * Keeps the logic out of screens.
 */
export function applyAmountKey(prev: string, k: NumericKey) {
  const curr = String(prev || "0");

  if (k === "back") {
    const next = curr.length <= 1 ? "0" : curr.slice(0, -1);
    return next === "" ? "0" : next;
  }

  if (k === ".") {
    if (curr.includes(".")) return curr;
    return curr + ".";
  }

  // digit
  if (curr === "0") return k;
  return clampAmount(curr + k);
}

type Props = {
  value: string; // raw numeric string, no commas
  kind?: "income" | "expense";
  currencySymbol?: string;
  majorFontSize?: number;
  minorFontSize?: number;
  helperText?: string;
  error?: string;
};

export function AmountInput({
  value,
  kind = "expense",
  currencySymbol = "$",
  majorFontSize = tokens.typography.amount.fontSize,
  minorFontSize = 28,
  helperText,
  error,
}: Props) {
  const formatted = formatForTicker(value, currencySymbol);

  const color =
    kind === "income" ? tokens.colors.success : tokens.colors.danger;

  return (
    <View className="w-full items-center">
      <OdometerAmount
        value={formatted}
        majorFontSize={majorFontSize}
        minorFontSize={minorFontSize}
        color={color}
      />

      {helperText ? (
        <AppText variant="sm" tone="muted" className="mt-2">
          {helperText}
        </AppText>
      ) : null}

      {error ? (
        <AppText variant="sm" tone="danger" className="mt-2">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export default AmountInput;
