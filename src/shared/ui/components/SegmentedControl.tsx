import React from "react";
import { View } from "react-native";

import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";

type Item<T extends string> = {
  label: string;
  value: T;
};

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Item<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: tokens.radii.pill,
        borderWidth: 1,
        borderColor: tokens.colors.stroke,
        backgroundColor: tokens.colors.surface,
        padding: 4,
        gap: 4,
      }}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <HapticPressable
            key={item.value}
            onPress={() => onChange(item.value)}
            haptic="selection"
            pressScale={0.99}
            style={{
              minHeight: 46,
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: tokens.radii.pill,
              backgroundColor: active ? tokens.colors.greenSoft : "transparent",
            }}
          >
            <AppText
              variant="sm"
              style={{
                color: active ? tokens.colors.accent : tokens.colors.text,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              {item.label}
            </AppText>
          </HapticPressable>
        );
      })}
    </View>
  );
}

export default SegmentedControl;
