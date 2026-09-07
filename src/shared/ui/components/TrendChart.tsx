import React, { useState } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AppText } from "@/shared/ui/components/AppText";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";
import { withAlpha } from "@/shared/ui/theme/color";

export type TrendPoint = {
  /** Axis label, e.g. "M" or "Aug". */
  label: string;
  /** Amount in minor units. Always >= 0. */
  value: number;
  /** Emphasised bar - today, or the selected month. */
  current?: boolean;
};

/**
 * The app's one bar chart, used for Home's weekly spend and Insights' monthly
 * trend.
 *
 * Inactive bars are muted and only the current/selected bar carries brand
 * color - a lit gradient with a soft bloom - so the chart reads at a glance
 * instead of presenting seven equally loud columns. A day with no activity is
 * dimmer again, so an empty column is visibly empty rather than merely short.
 *
 * There is no grid and no y-axis: the tooltip on touch carries the exact
 * figure when it is actually wanted. Bars stagger in a couple of frames apart
 * on entry, which is the only motion here.
 */
export function TrendChart({
  data,
  height = 180,
  /** Formats the touch tooltip. Receives minor units. */
  formatValue,
  accessibilityLabel,
}: {
  data: TrendPoint[];
  height?: number;
  formatValue?: (minor: number) => string;
  accessibilityLabel?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const max = Math.max(1, ...data.map((d) => d.value));
  const plotHeight = height - 44; // leaves room for the axis labels

  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={{ height }}>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: tokens.space[2],
        }}
      >
        {data.map((point, index) => {
          const isActive = selected === index || (selected === null && point.current);
          const barHeight = Math.max(4, Math.round((point.value / max) * plotHeight));
          const showTip = selected === index && formatValue;

          return (
            <HapticPressable
              key={`${point.label}-${index}`}
              // Reading a value off the chart is a read - silent.
              haptic="none"
              pressScale={1}
              pressOpacity={1}
              onPress={() => setSelected((cur) => (cur === index ? null : index))}
              accessibilityRole="button"
              accessibilityLabel={`${point.label}: ${formatValue ? formatValue(point.value) : point.value}`}
              style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}
            >
              {showTip ? (
                <View
                  style={{
                    position: "absolute",
                    bottom: barHeight + 8,
                    paddingHorizontal: tokens.space[2],
                    paddingVertical: 4,
                    borderRadius: tokens.radii.sm,
                    backgroundColor: tokens.colors.surfacePressed,
                    borderWidth: 1,
                    borderColor: tokens.colors.stroke,
                    zIndex: 2,
                  }}
                >
                  <MoneyAmount value={formatValue(point.value)} tone="neutral" size="sm" />
                </View>
              ) : null}

              <Animated.View
                entering={FadeInDown.duration(tokens.motion.base).delay(index * tokens.motion.listStagger)}
                style={[
                  {
                    width: "100%",
                    maxWidth: 28,
                    height: barHeight,
                    borderRadius: tokens.radii.sm,
                    overflow: "hidden",
                    backgroundColor:
                      point.value === 0 ? tokens.colors.surface : tokens.colors.surfacePressed,
                  },
                  isActive ? tokens.glow.accentSoft : null,
                ]}
              >
                {isActive ? (
                  <LinearGradient
                    colors={[withAlpha(tokens.colors.income, 1), tokens.colors.accent]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={{ flex: 1 }}
                  />
                ) : null}
              </Animated.View>

              <AppText
                variant="xs"
                numberOfLines={1}
                style={{
                  marginTop: tokens.space[2],
                  letterSpacing: 0,
                  color: isActive ? tokens.colors.text : tokens.colors.subtle,
                }}
              >
                {point.label}
              </AppText>
            </HapticPressable>
          );
        })}
      </View>
    </View>
  );
}

export default TrendChart;
