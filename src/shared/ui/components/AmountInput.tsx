import React from "react";
import { View } from "react-native";

import { tokens } from "@/shared/ui/theme/tokens";
import { amountColor } from "@/shared/ui/theme/money";
import { AppText } from "@/shared/ui/components/AppText";
import { OdometerAmount } from "@/shared/ui/components/OdometerAmount";
import type { Key as NumericKey } from "@/shared/ui/NumericKeypad";

function clampAmount(next: string, fractionDigits: number) {
  if (fractionDigits <= 0) return next.split(".")[0] ?? "0";
  if (!next.includes(".")) return next;
  const [a, b = ""] = next.split(".");
  return `${a}.${b.slice(0, fractionDigits)}`;
}

export function formatForTicker(raw: string, currencySymbol = "$", fractionDigits = 2) {
  const s = String(raw || "0");
  const hasDot = s.includes(".");
  const [intRaw, decRaw = ""] = s.split(".");

  const safeInt = (intRaw || "0").replace(/[^\d]/g, "") || "0";

  if (!hasDot || fractionDigits <= 0) return `${currencySymbol}${safeInt}`;

  const d = (decRaw + "0".repeat(fractionDigits)).slice(0, fractionDigits);
  return `${currencySymbol}${safeInt}.${d}`;
}

/**
 * Helper to mutate an amount string based on NumericKeypad keys.
 * Keeps the logic out of screens.
 */
export function applyAmountKey(prev: string, k: NumericKey, fractionDigits = 2) {
  const curr = String(prev || "0");

  if (k === "back") {
    const next = curr.length <= 1 ? "0" : curr.slice(0, -1);
    return next === "" ? "0" : next;
  }

  if (k === ".") {
    if (fractionDigits <= 0) return curr;
    if (curr.includes(".")) return curr;
    return curr + ".";
  }

  // digit
  if (curr === "0") return k;
  return clampAmount(curr + k, fractionDigits);
}

type Props = {
  value: string; // raw numeric string, no commas
  type?: "income" | "expense";
  kind?: "income" | "expense";
  currencySymbol?: string;
  fractionDigits?: number;
  majorFontSize?: number;
  minorFontSize?: number;
  helperText?: string;
  error?: string;
};

export function AmountInput({
  value,
  type,
  kind = "expense",
  currencySymbol = "$",
  fractionDigits = 2,
  majorFontSize = tokens.typography.amount.fontSize,
  minorFontSize = 28,
  helperText,
  error,
}: Props) {
  const formatted = formatForTicker(value, currencySymbol, fractionDigits);
  const valueNum = Number.parseFloat(String(value || "0"));
  const transactionType = type ?? kind;
  const isEmpty = !Number.isFinite(valueNum) || valueNum <= 0;

  // An untouched "0" stays neutral; as soon as there is a value it takes the
  // money color so the sign of what you are entering is never ambiguous.
  const color = isEmpty ? tokens.colors.muted : amountColor(transactionType);

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
