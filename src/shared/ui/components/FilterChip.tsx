import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";

/**
 * The single chip in the product.
 *
 * `icon`/`iconColor` cover the category variant, `clearable` marks a filter
 * that is dismissed by pressing it again. Screens must not hand-roll a second chip - if a new need appears,
 * it becomes a prop here so every chip keeps the same height, radius and
 * selected treatment.
 */
export function FilterChip({
  label,
  active,
  onPress,
  icon,
  iconColor,
  clearable,
  /** `accent` selects in brand green; `income`/`expense` select semantically. */
  tone = "accent",
  style,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: string;
  iconColor?: string;
  /** Show a × on the selected chip, for filters that toggle off on press. */
  clearable?: boolean;
  tone?: "accent" | "income" | "expense";
  style?: object;
}) {
  const selectedColor =
    tone === "income"
      ? tokens.semantic.income
      : tone === "expense"
        ? tokens.semantic.expense
        : tokens.colors.accent;

  return (
    <HapticPressable
      onPress={onPress}
      haptic="selection"
      pressScale={0.97}
      android_ripple={{ color: tokens.colors.ripple, borderless: true }}
      style={[
        {
          minHeight: tokens.layout.minTap,
          paddingHorizontal: tokens.space[4],
          borderRadius: tokens.radii.pill,
          borderWidth: 1,
          flexDirection: "row",
          alignItems: "center",
          borderColor: active ? `${selectedColor}59` : tokens.colors.stroke,
          backgroundColor: active ? `${selectedColor}1F` : tokens.colors.surface,
        },
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon as any}
          size={16}
          color={active ? selectedColor : (iconColor ?? tokens.colors.muted)}
          style={{ marginRight: tokens.space[2] }}
        />
      ) : null}

      <AppText
        variant="sm"
        weight="semibold"
        numberOfLines={1}
        style={{ color: active ? selectedColor : tokens.colors.text }}
      >
        {label}
      </AppText>

      {active && clearable ? (
        <View style={{ marginLeft: tokens.space[2] }}>
          <Ionicons name="close" size={14} color={selectedColor} />
        </View>
      ) : null}
    </HapticPressable>
  );
}

export default FilterChip;
