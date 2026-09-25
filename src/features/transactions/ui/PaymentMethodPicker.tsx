import { View } from "react-native";

import { FilterChip } from "@/shared/ui/components/FilterChip";
import { tokens } from "@/shared/ui/theme/tokens";
import { PAYMENT_OPTIONS } from "../filterModel";
import type { PaymentMethod } from "../model";

/**
 * The server's fixed payment-method enum as one wrapping row of chips. Optional by
 * design: nothing is preselected, and pressing the selected chip clears it back to
 * "Not specified" (`null`) - never a fabricated CASH.
 */
export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod | null;
  onChange: (next: PaymentMethod | null) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.space[2] }}>
      {PAYMENT_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <FilterChip
            key={option.value}
            label={option.label}
            active={active}
            clearable
            role="category"
            onPress={() => onChange(active ? null : option.value)}
          />
        );
      })}
    </View>
  );
}
