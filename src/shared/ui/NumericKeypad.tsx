import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fonts, tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

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
 * Keys sit on a soft surface with no outline: twelve rings was the busiest
 * element on the amount screen, but a filled key still reads as a target.
 * Pressing lifts the fill one step rather than adding a border.
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
  const [pressed, setPressed] = useState(false);
  const isBackspace = label === "back";

  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      pressScale={0.94}
      pressOpacity={1}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={isBackspace ? "Delete" : label}
      style={styles.keyTouch}
      android_ripple={{ color: tokens.colors.ripple, borderless: true }}
    >
      <View style={[styles.key, pressed && !disabled ? styles.keyPressed : null]}>
        {isBackspace ? (
          <Ionicons name="backspace-outline" size={24} color={tokens.colors.muted} />
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
      </View>
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
    height: 60,
  },
  key: {
    flex: 1,
    borderRadius: tokens.radii.md,
    backgroundColor: tokens.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  keyPressed: {
    backgroundColor: tokens.colors.surfacePressed,
  },
  keyLabel: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: fonts.medium,
    fontVariant: ["tabular-nums"],
  },
});
