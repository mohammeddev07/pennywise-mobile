import React, { type ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/shared/ui/components/AppText";

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <AppText variant="xl">{title}</AppText>
      {action}
    </View>
  );
}

export default SectionHeader;
