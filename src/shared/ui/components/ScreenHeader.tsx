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

/**
 * Page header for tab screens: title on the left, at most one utility control
 * on the right. Using it everywhere is what keeps titles landing on the same
 * baseline as you move between tabs.
 */
export function ScreenHeader({ title, subtitle, left, right, titleVariant = "2xl" }: Props) {
  return (
    <View
      style={{
        minHeight: tokens.layout.iconTap,
        flexDirection: "row",
        alignItems: "center",
        gap: tokens.space[3],
      }}
    >
      {left}
      <View style={{ flex: 1 }}>
        <AppText variant={titleVariant} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="sm" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export default ScreenHeader;
