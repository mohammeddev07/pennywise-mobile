import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { tokens } from "@/shared/ui/theme/tokens";
import { amountColor } from "@/shared/ui/theme/money";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import type { TransactionKind } from "@/shared/types/models";

/**
 * Expense/Income switch. The active half takes the money color so the choice
 * matches the color the amount is about to render in.
 */
export function TypeToggle({
  value,
  onChange,
  disabled,
}: {
  value: TransactionKind;
  onChange: (next: TransactionKind) => void;
  disabled?: boolean;
}) {
  return (
    <View
      className="flex-row rounded-full border border-stroke bg-surface p-1"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {(["EXPENSE", "INCOME"] as const).map((item) => {
        const active = value === item;
        const color = amountColor(item);
        return (
          <HapticPressable
            key={item}
            onPress={() => onChange(item)}
            disabled={disabled}
            haptic="selection"
            pressScale={0.98}
            className="h-11 flex-row items-center justify-center rounded-full px-5"
            style={{ backgroundColor: active ? `${color}16` : "transparent" }}
            android_ripple={{ color: "#0B122012", borderless: true }}
          >
            <Ionicons
              name={item === "EXPENSE" ? "arrow-up" : "arrow-down"}
              size={16}
              color={active ? color : tokens.colors.muted}
            />
            <AppText
              variant="sm"
              weight="semibold"
              className="ml-2"
              style={{ color: active ? color : tokens.colors.muted }}
            >
              {item === "EXPENSE" ? "Expense" : "Income"}
            </AppText>
          </HapticPressable>
        );
      })}
    </View>
  );
}

export default TypeToggle;
