import { memo, useEffect, useMemo, useRef } from "react";
import { Text, View, type TextStyle, type ViewStyle } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";

type Props = {
  /**
   * A formatted string like "$0" or "$1234.00"
   * Digits animate; symbols render static.
   *
   * IMPORTANT: for typing stability, prefer NO commas while editing.
   */
  value: string;

  majorFontSize?: number;
  minorFontSize?: number;
  color?: string;
  style?: ViewStyle;

  showGuides?: boolean;
};

const springCfg = {
  stiffness: 560,
  damping: 46,
  mass: 0.9,
};

function isDigit(ch: string) {
  return ch >= "0" && ch <= "9";
}

function DigitWheel({
  digit,
  height,
  width,
  fontSize,
  color,
  showGuides,
}: {
  digit: number;
  height: number;
  width: number;
  fontSize: number;
  color: string;
  showGuides?: boolean;
}) {
  // 0-9 repeated enough times for continuity.
  const rows = 30;

  // New columns start at 0 and spring to target.
  const index = useSharedValue(10);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      index.value = withSpring(10 + digit, springCfg);
      return;
    }

    // Shortest-path wheel motion on updates
    const base = index.value;
    const currDigit = ((base % 10) + 10) % 10;

    const forward = (digit - currDigit + 10) % 10; // 0..9
    const backward = forward === 0 ? 0 : forward - 10; // 0 or -9..-1
    const step = Math.abs(backward) < Math.abs(forward) ? backward : forward;

    let nextIndex = base + step;

    // keep in safe zone
    if (nextIndex < 7) nextIndex += 10;
    if (nextIndex > rows - 7) nextIndex -= 10;

    index.value = withSpring(nextIndex, springCfg);
  }, [digit, index]);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -index.value * height }],
  }));

  const textStyle = useMemo<TextStyle>(
    () => ({
      height,
      width,
      textAlign: "center",
      fontSize,
      fontWeight: "900",
      letterSpacing: -0.6,
      color,
      includeFontPadding: false,
      textAlignVertical: "center",
      fontVariant: ["tabular-nums"],
    }),
    [color, fontSize, height, width]
  );

  return (
    <View style={{ height, width, overflow: "hidden" }}>
      {showGuides ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: "rgba(0,200,5,0.35)",
          }}
        />
      ) : null}

      <Animated.View style={aStyle}>
        {Array.from({ length: rows }).map((_, i) => (
          <Text key={i} style={textStyle}>
            {i % 10}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

function StaticChar({
  ch,
  fontSize,
  color,
  height,
  width,
}: {
  ch: string;
  fontSize: number;
  color: string;
  height: number;
  width: number;
}) {
  return (
    <View style={{ height, width, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
      <Text
        style={{
          fontSize,
          fontWeight: "900",
          letterSpacing: -0.6,
          color,
          includeFontPadding: false,
          fontVariant: ["tabular-nums"],
        }}
      >
        {ch}
      </Text>
    </View>
  );
}

export const OdometerAmount = memo(function OdometerAmount({
  value,
  majorFontSize = 84,
  minorFontSize = 46,
  color = tokens.colors.text,
  style,
  showGuides = false,
}: Props) {
  const dotIndex = value.indexOf(".");
  const chars = useMemo(() => value.split(""), [value]);

  const majorHeight = Math.round(majorFontSize * 1.08);
  const minorHeight = Math.round(minorFontSize * 1.08);

  const majorWidth = Math.round(majorFontSize * 0.60);
  const minorWidth = Math.round(minorFontSize * 0.60);

  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-end" }, style]}>
      {chars.map((ch, idx) => {
        const isAfterDot = dotIndex !== -1 && idx > dotIndex;
        const isDotOrPrefix = ch === "." || ch === "$";
        const useMinor = isAfterDot || isDotOrPrefix;

        const fontSize = useMinor ? minorFontSize : majorFontSize;
        const height = useMinor ? minorHeight : majorHeight;

        const width =
          ch === "," ? Math.round((useMinor ? minorWidth : majorWidth) * 0.52)
          : ch === "." ? Math.round((useMinor ? minorWidth : majorWidth) * 0.44)
          : ch === "$" ? Math.round(minorWidth * 0.75)
          : useMinor
            ? minorWidth
            : majorWidth;

        // ✅ Wrap each column with entering/exiting animation
        if (isDigit(ch)) {
          return (
            <Animated.View
              key={`d_${idx}`}
              entering={FadeInDown.duration(140)}
              exiting={FadeOutUp.duration(140)}
            >
              <DigitWheel
                digit={Number(ch)}
                height={height}
                width={width}
                fontSize={fontSize}
                color={color}
                showGuides={showGuides}
              />
            </Animated.View>
          );
        }

        return (
          <Animated.View
            key={`s_${idx}`}
            entering={FadeInDown.duration(120)}
            exiting={FadeOutUp.duration(120)}
          >
            <StaticChar ch={ch} fontSize={fontSize} color={color} height={height} width={width} />
          </Animated.View>
        );
      })}
    </View>
  );
});
