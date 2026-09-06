import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";
import { Icon } from "./Icon";

/**
 * The single chip in the product.
 *
 * `icon`/`iconColor` cover the category variant, `clearable` marks a filter
 * that is dismissed by pressing it again. Screens must not hand-roll a second chip - if a new need appears,
 * it becomes a prop here so every chip keeps the same height, radius and
 * selected treatment.
 *
 * `role` decides the haptic, and only the haptic. Picking a category is a
 * commit, so it ticks; narrowing a filter is a read, so it stays silent.
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
  role = "filter",
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
  /** `category` ticks on select; `filter` is silent. */
  role?: "filter" | "category";
  style?: object;
}) {
  const pop = useSharedValue(1);

  useEffect(() => {
    if (!active) return;
    pop.value = withSequence(withTiming(1.12, { duration: 90 }), withSpring(1, tokens.spring.chipIcon));
  }, [active, pop]);

  const iconPop = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const selectedColor =
    tone === "income"
      ? tokens.semantic.income
      : tone === "expense"
        ? tokens.semantic.expense
        : tokens.colors.accent;

  return (
    <HapticPressable
      onPress={onPress}
      haptic={role === "category" ? "selection" : "none"}
      pressScale={0.97}
      android_ripple={{ color: tokens.colors.ripple, borderless: true }}
      style={[
        {
          minHeight: tokens.layout.minTap,
          paddingHorizontal: tokens.space[4],
          borderRadius: tokens.radii.pill,
          // A selected chip is read by its ring as much as its fill, so the
          // border is a touch heavier than a card hairline.
          borderWidth: 1.5,
          flexDirection: "row",
          alignItems: "center",
          borderColor: active ? `${selectedColor}66` : tokens.colors.stroke,
          backgroundColor: active ? `${selectedColor}1A` : tokens.colors.surfaceAlt,
        },
        style,
      ]}
    >
      {icon ? (
        <Animated.View style={[{ marginRight: tokens.space[2] }, iconPop]}>
          <Icon
            name={icon as any}
            size={tokens.icon.chip}
            color={active ? selectedColor : (iconColor ?? tokens.colors.muted)}
          />
        </Animated.View>
      ) : null}

      <AppText
        variant="sm"
        weight={active ? "bold" : "semibold"}
        numberOfLines={1}
        style={{ color: active ? selectedColor : tokens.colors.text }}
      >
        {label}
      </AppText>

      {active && clearable ? (
        <View style={{ marginLeft: tokens.space[2] }}>
          <Icon name="close" size={14} color={selectedColor} />
        </View>
      ) : null}
    </HapticPressable>
  );
}

export default FilterChip;
