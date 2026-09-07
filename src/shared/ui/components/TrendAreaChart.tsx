import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";
import { withAlpha } from "@/shared/ui/theme/color";

export type AreaPoint = {
  /** Axis label, e.g. "M". */
  label: string;
  /** Amount in minor units. Always >= 0. */
  value: number;
};

/**
 * Smooth trend line with a faded fill, for a short run of days.
 *
 * A line reads a week's *shape* better than seven separate bars, which is why
 * Home uses this and Insights uses `TrendChart` - one shows movement, the
 * other compares periods. There is no grid and no y-axis; tapping a point
 * shows its exact value.
 */
export function TrendAreaChart({
  data,
  height = 190,
  formatValue,
  accessibilityLabel,
}: {
  data: AreaPoint[];
  height?: number;
  formatValue?: (minor: number) => string;
  accessibilityLabel?: string;
}) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const labelRow = 24;
  const plotHeight = Math.max(40, height - labelRow - 8);
  const padY = 12;

  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: padY + (1 - d.value / max) * (plotHeight - padY * 2),
  }));

  // Catmull-Rom control points, so the line curves without overshooting into
  // negative territory the way a naive bezier does.
  const line = points.reduce((path, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${path} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, "");

  const area = points.length > 1 ? `${line} L ${width} ${plotHeight} L 0 ${plotHeight} Z` : "";
  const last = points[points.length - 1];
  const tip = selected !== null ? points[selected] : null;

  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={{ height }}>
      <View style={{ height: plotHeight }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && points.length > 1 ? (
          <Svg width={width} height={plotHeight}>
            <Defs>
              <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={tokens.colors.accent} stopOpacity="0.28" />
                <Stop offset="1" stopColor={tokens.colors.accent} stopOpacity="0" />
              </LinearGradient>
            </Defs>

            <Path d={area} fill="url(#trendFill)" />
            <Path
              d={line}
              stroke={tokens.colors.accent}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* The most recent day is the one the eye should land on. */}
            <Circle cx={last.x} cy={last.y} r={7} fill={withAlpha(tokens.colors.accent, 0.2)} />
            <Circle cx={last.x} cy={last.y} r={3.5} fill={tokens.colors.accent} />

            {tip ? <Circle cx={tip.x} cy={tip.y} r={4} fill={tokens.colors.text} /> : null}
          </Svg>
        ) : null}

        {tip && formatValue ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: Math.max(0, Math.min(width - 90, tip.x - 45)),
              top: Math.max(0, tip.y - 34),
              width: 90,
              alignItems: "center",
            }}
          >
            <View
              style={{
                paddingHorizontal: tokens.space[2],
                paddingVertical: 4,
                borderRadius: tokens.radii.sm,
                backgroundColor: tokens.colors.surfacePressed,
                borderWidth: 1,
                borderColor: tokens.colors.stroke,
              }}
            >
              <AppText variant="xs" weight="semibold" numberOfLines={1}>
                {formatValue(data[selected as number].value)}
              </AppText>
            </View>
          </View>
        ) : null}
      </View>

      {/* Labels sit on the same x as their point, not on an even N-way split,
          so the axis lines up with the curve. */}
      <View style={{ height: labelRow }}>
        {width > 0
          ? data.map((point, index) => {
              const isLast = index === data.length - 1;
              const isActive = selected === index || (selected === null && isLast);
              const x = points[index]?.x ?? 0;

              return (
                <HapticPressable
                  key={`${point.label}-${index}`}
                  haptic="none"
                  pressScale={1}
                  pressOpacity={1}
                  onPress={() => setSelected((cur) => (cur === index ? null : index))}
                  accessibilityRole="button"
                  accessibilityLabel={`${point.label}: ${formatValue ? formatValue(point.value) : point.value}`}
                  style={{
                    position: "absolute",
                    left: x - 22,
                    width: 44,
                    height: labelRow,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppText
                    variant="xs"
                    style={{
                      letterSpacing: 0,
                      color: isActive ? tokens.colors.text : tokens.colors.subtle,
                    }}
                  >
                    {point.label}
                  </AppText>
                </HapticPressable>
              );
            })
          : null}
      </View>

    </View>
  );
}

export default TrendAreaChart;
