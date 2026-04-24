import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/shared/ui/components/AppText";
import { CategoryIcon } from "@/shared/ui/components/CategoryIcon";
import { tokens } from "@/shared/ui/theme/tokens";

type Tone = "income" | "expense" | "neutral" | "primary";

function toneColor(tone: Tone) {
  if (tone === "expense") return tokens.colors.danger;
  if (tone === "neutral") return "#5B5BF7";
  return tokens.colors.accent;
}

function toneIcon(tone: Tone): keyof typeof Ionicons.glyphMap {
  if (tone === "expense") return "arrow-up";
  if (tone === "neutral") return "wallet-outline";
  return "arrow-down";
}

export function SummaryStat({
  label,
  value,
  tone = "primary",
  icon,
}: {
  label: string;
  value: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const color = toneColor(tone);
  return (
    <View
      style={{
        flex: 1,
        minHeight: 86,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: tokens.radii.md,
        borderWidth: 1,
        borderColor: tokens.colors.stroke,
        backgroundColor: tokens.colors.surface,
        padding: tokens.space[4],
      }}
    >
      <CategoryIcon icon={icon ?? toneIcon(tone)} color={color} size={48} />
      <View style={{ marginLeft: 14, flex: 1 }}>
        <AppText variant="sm" tone="muted">
          {label}
        </AppText>
        <AppText variant="base" style={{ marginTop: 2, color, fontFamily: "Inter_700Bold" }} numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

export default SummaryStat;
