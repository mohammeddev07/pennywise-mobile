import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { numerals, tokens } from "@/shared/ui/theme/tokens";
import { withAlpha } from "@/shared/ui/theme/color";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Icon } from "@/shared/ui/components/Icon";

export type Key = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back";
type DigitKey = Exclude<Key, "back">;

type Props = {
  onPress?: (key: string) => void;
  onDelete?: () => void;
  disabled?: boolean;
  decimalAllowed?: boolean;
  /**
   * Legacy adapter kept while older screens migrate to the split callbacks.
   * The visual contract still uses the new keypad spec.
   */
  onKey?: (k: Key) => void;
  containerClassName?: string;
  keyHeight?: number;
};

const ROWS: DigitKey[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0"],
];

/**
 * Keys are machined rather than outlined: a two-stop vertical gradient with a
 * 1px top-edge highlight, so twelve of them read as a keypad without twelve
 * rings - the busiest element the old amount screen had.
 *
 * A press drops the key to 0.92 in 90ms and releases on a spring, so the key
 * moves before the number does. Digits are Sora, like every other number in
 * the product.
 */
export function NumericKeypad({
  onPress,
  onDelete,
  onKey,
  disabled = false,
  decimalAllowed = true,
}: Props) {
  const press = (key: DigitKey) => {
    if (key === "." && !decimalAllowed) return;
    if (onPress) onPress(key);
    else onKey?.(key);
  };

  const deleteKey = () => {
    if (onDelete) onDelete();
    else onKey?.("back");
  };

  return (
    <View style={styles.container}>
      {ROWS.map((row, rowIndex) => (
        <View key={row.join("")} style={styles.row}>
          {row.map((key) => (
            <KeyBtn
              key={key}
              label={key}
              disabled={disabled || (key === "." && !decimalAllowed)}
              muted={key === "." && !decimalAllowed}
              onPress={() => press(key)}
            />
          ))}
          {rowIndex === ROWS.length - 1 ? (
            <KeyBtn label="back" disabled={disabled} muted onPress={deleteKey} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function KeyBtn({
  label,
  onPress,
  disabled,
  muted,
}: {
  label: DigitKey | "back";
  onPress: () => void;
  disabled?: boolean;
  muted?: boolean;
}) {
  const isBackspace = label === "back";
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      // Every key press is an edit to the amount, so it ticks - the one place
      // in the product where a repeated Light impact is correct.
      haptic="impactLight"
      pressScale={1} // the key itself scales, not the touch target
      pressOpacity={1}
      onPressIn={() => {
        if (disabled) return;
        scale.value = withTiming(0.92, { duration: tokens.motion.pressIn });
      }}
      onPressOut={() => {
        if (disabled) return;
        scale.value = withSpring(1, tokens.spring.key);
      }}
      accessibilityRole="button"
      accessibilityLabel={isBackspace ? "Delete" : label}
      style={styles.keyTouch}
      android_ripple={{ color: tokens.colors.ripple, borderless: true }}
    >
      <Animated.View style={[styles.key, animated]}>
        <LinearGradient
          colors={[tokens.colors.surfaceAlt, tokens.colors.surface]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.keyFace}
        >
          {isBackspace ? (
            <Icon name="backspace-outline" size={24} color={tokens.colors.muted} />
          ) : (
            <AppText
              style={[
                styles.keyLabel,
                { color: muted ? tokens.colors.subtle : tokens.colors.text },
              ]}
            >
              {label}
            </AppText>
          )}
        </LinearGradient>
      </Animated.View>
    </HapticPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: tokens.space[2],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space[2],
  },
  keyTouch: {
    flex: 1,
    height: tokens.layout.keyHeight,
  },
  key: {
    flex: 1,
    borderRadius: tokens.radii.key,
    overflow: "hidden",
  },
  keyFace: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radii.key,
    // The top-edge highlight, not a full outline - it lifts the key off the
    // screen without ringing it.
    borderTopWidth: 1,
    borderTopColor: withAlpha(tokens.colors.white, 0.06),
  },
  keyLabel: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: numerals.semibold,
    fontVariant: ["tabular-nums"],
  },
});
