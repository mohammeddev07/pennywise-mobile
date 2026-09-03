import React from "react";

import { SegmentedControl } from "@/shared/ui/components/SegmentedControl";
import { amountColor } from "@/shared/ui/theme/money";
import type { TransactionKind } from "@/shared/types/models";

/**
 * Expense/Income switch.
 *
 * A thin binding over `SegmentedControl` rather than its own control: the
 * selected half takes the money color, so the choice matches the color the
 * amount is about to render in.
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
    <SegmentedControl<TransactionKind>
      value={value}
      onChange={onChange}
      disabled={disabled}
      items={[
        { label: "Expense", value: "EXPENSE", icon: "arrow-up", color: amountColor("EXPENSE") },
        { label: "Income", value: "INCOME", icon: "arrow-down", color: amountColor("INCOME") },
      ]}
    />
  );
}

export default TypeToggle;
