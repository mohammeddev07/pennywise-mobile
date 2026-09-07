import React, { type ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/shared/ui/components/AppText";
import { tokens } from "@/shared/ui/theme/tokens";

/**
 * Section label above a block of content.
 *
 * `overline` is the default: small, spaced, muted caps that separate sections
 * without competing with the numbers under them. `title` is the heavier form,
 * for the rare section that is a heading in its own right.
 */
export function SectionHeader({
  title,
  action,
  variant = "overline",
  style,
}: {
  title: string;
  action?: ReactNode;
  variant?: "overline" | "title";
  style?: object;
}) {
  return (
    <View
      style={[
        {
          minHeight: variant === "overline" ? 24 : tokens.layout.minTap,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        style,
      ]}
    >
      {variant === "overline" ? (
        <AppText variant="xs" tone="muted">
          {title.toUpperCase()}
        </AppText>
      ) : (
        <AppText variant="xl">{title}</AppText>
      )}
      {action}
    </View>
  );
}

export default SectionHeader;
