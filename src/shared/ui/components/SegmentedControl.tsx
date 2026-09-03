import React, { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";
import { withAlpha } from "@/shared/ui/theme/color";

export type SegmentItem<T extends string> = {
  label: string;
  value: T;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Color of the selected state. Defaults to brand green. */
  color?: string;
};

const PAD = 4;

/**
 * Equal-width segmented control with a sliding selection.
 *
 * The indicator is one animated view rather than a background per segment, so
 * the selection genuinely slides and its color cross-fades when the two
 * options mean different things (expense red vs income green).
 */
export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  disabled,
}: {
  items: SegmentItem<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const [width, setWidth] = useState(0);

  const index = Math.max(
    0,
    items.findIndex((i) => i.value === value)
  );
  const segmentWidth = width > 0 ? (width - PAD * 2) / items.length : 0;

  const progress = useDerivedValue(
    () => withTiming(index, { duration: tokens.motion.base }),
    [index]
  );

  // rgba, not 8-digit hex: interpolateColor needs the former.
  const colors = items.map((i) => withAlpha(i.color ?? tokens.colors.accent, 0.14));

  const borders = items.map((i) => withAlpha(i.color ?? tokens.colors.accent, 0.35));

  const indicator = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: progress.value * segmentWidth }],
    backgroundColor:
      colors.length > 1
        ? interpolateColor(
            progress.value,
            items.map((_, i) => i),
            colors
          )
        : colors[0],
    borderColor:
      borders.length > 1
        ? interpolateColor(
            progress.value,
            items.map((_, i) => i),
            borders
          )
        : borders[0],
  }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        width: "100%",
        height: tokens.layout.controlHeight,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: tokens.radii.pill,
        backgroundColor: tokens.colors.surface,
        borderWidth: 1,
        borderColor: tokens.colors.stroke,
        padding: PAD,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: PAD,
              top: PAD,
              bottom: PAD,
              borderRadius: tokens.radii.pill,
              borderWidth: 1,
            },
            indicator,
          ]}
        />
      ) : null}

      {items.map((item) => {
        const active = item.value === value;
        const color = item.color ?? tokens.colors.accent;

        return (
          <HapticPressable
            key={item.value}
            onPress={() => onChange(item.value)}
            disabled={disabled}
            haptic="selection"
            pressScale={0.98}
            pressOpacity={1}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              height: "100%",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: tokens.space[2],
            }}
          >
            {item.icon ? (
              <Ionicons
                name={item.icon}
                size={16}
                color={active ? color : tokens.colors.muted}
              />
            ) : null}
            <AppText
              variant="sm"
              weight="semibold"
              style={{ color: active ? color : tokens.colors.muted }}
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
