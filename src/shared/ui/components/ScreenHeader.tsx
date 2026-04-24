import React, { type ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/shared/ui/components/AppText";
import { tokens } from "@/shared/ui/theme/tokens";

type Props = {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  titleVariant?: "2xl" | "3xl" | "xl";
};

export function ScreenHeader({ title, subtitle, left, right, titleVariant = "2xl" }: Props) {
  return (
    <View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", gap: tokens.space[3] }}>
      {left}
      <View style={{ flex: 1 }}>
        <AppText variant={titleVariant}>{title}</AppText>
        {subtitle ? (
          <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[1] }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export default ScreenHeader;
