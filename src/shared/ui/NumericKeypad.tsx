import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

const COLORS = {
  bg: tokens.colors.app,
  surface: tokens.colors.surface,
  card: tokens.colors.card,
  stroke: tokens.colors.stroke,
  text: tokens.colors.text,
  muted: tokens.colors.muted,
  accent: tokens.colors.accent,
} as const;

const SPACING = {
  0: tokens.space[0],
  4: tokens.space[1],
  8: tokens.space[2],
  12: tokens.space[3],
  16: tokens.space[4],
  20: tokens.space[5],
  24: tokens.space[6],
  32: tokens.space[7],
  40: tokens.space[8],
} as const;

const RADIUS = {
  pill: tokens.radii.pill,
} as const;

const TYPOGRAPHY = tokens.typography;

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
            <KeyBtn
              label="back"
              disabled={disabled}
              muted
              onPress={deleteKey}
            />
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
  // Circle-in-touch-area keeps every keypad target generous without making the UI feel heavy.
  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      pressScale={0.96}
      pressOpacity={1}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={styles.keyTouch}
      android_ripple={{ color: "#0B122012", borderless: true }}
    >
      <View style={[styles.keyCircle, pressed && !disabled ? styles.keyCirclePressed : null]}>
        {isBackspace ? (
          <Ionicons name="backspace-outline" size={22} color={COLORS.accent} />
        ) : (
          <AppText
            variant={label === "." ? "lg" : "2xl"}
            style={[
              label === "." ? TYPOGRAPHY.lg : TYPOGRAPHY["2xl"],
              { color: muted ? COLORS.muted : COLORS.text },
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
    alignItems: "center",
    gap: SPACING[16],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING[24],
  },
  keyTouch: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  keyCircle: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  keyCirclePressed: {
    backgroundColor: tokens.colors.surfaceAlt,
  },
});
