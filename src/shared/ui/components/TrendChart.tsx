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
  /** Second tooltip line, e.g. "12 transactions". */
  caption?: string;
  /** Only part of this calendar period is inside the analysed window; drawn outlined and starred. */
  partial?: boolean;
};

/** Smallest bar that still reads as "some spend". Zero is never given this: it draws no bar at all. */
const MIN_POSITIVE_BAR = 2;

/** Zero draws no bar (it is not a sliver of spend); any positive value is at least `MIN_POSITIVE_BAR` tall. */
export function barHeightFor(value: number, max: number, plotHeight: number) {
  return value <= 0 ? 0 : Math.max(MIN_POSITIVE_BAR, Math.round((value / max) * plotHeight));
}

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
  selectedIndex,
  onSelect,
}: {
  data: TrendPoint[];
  height?: number;
  formatValue?: (minor: number) => string;
  accessibilityLabel?: string;
  /** Controlled selection. Omit both props for the self-managed tooltip Home uses. */
  selectedIndex?: number | null;
  onSelect?: (index: number | null) => void;
}) {
  const [own, setOwn] = useState<number | null>(null);
  const controlled = onSelect !== undefined;
  const selected = controlled ? (selectedIndex ?? null) : own;
  const select = (next: number | null) => (controlled ? onSelect(next) : setOwn(next));

  const max = Math.max(1, ...data.map((d) => d.value));
  const plotHeight = height - 44; // leaves room for the axis labels

  return (
    <View accessibilityLabel={accessibilityLabel} style={{ height }}>
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
          const barHeight = barHeightFor(point.value, max, plotHeight);
          const showTip = selected === index && formatValue;

          return (
            <HapticPressable
              key={`${point.label}-${index}`}
              // Reading a value off the chart is a read - silent.
              haptic="none"
              pressScale={1}
              pressOpacity={1}
              onPress={() => select(selected === index ? null : index)}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === index }}
              accessibilityLabel={`${point.label}${point.partial ? " (partial period)" : ""}: ${formatValue ? formatValue(point.value) : point.value}${point.caption ? `, ${point.caption}` : ""}`}
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
                  {point.caption ? (
                    <AppText variant="xs" tone="muted" numberOfLines={1}>
                      {point.caption}
                    </AppText>
                  ) : null}
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
                    backgroundColor: tokens.colors.surfacePressed,
                  },
                  point.partial ? { borderWidth: 1, borderStyle: "dashed", borderColor: tokens.colors.muted } : null,
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
              {/* Honest zero baseline: every bar stands on it; an empty period is just the line. */}
              <View style={{ width: "100%", height: 1, backgroundColor: tokens.colors.stroke }} />

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
                {point.partial ? "*" : ""}
              </AppText>
            </HapticPressable>
          );
        })}
      </View>
    </View>
  );
}

export default TrendChart;
