import { View } from "react-native";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Icon } from "@/shared/ui/components/Icon";
import { useFilterStore, type ScopeKey } from "../filterStore";

/**
 * Shown on Activity and Insights while a drill-down is applied. Back re-applies the filter (and,
 * on Activity, the scroll position) that was in place before the drill; nothing else is discarded
 * or invented, because the drilled expression *is* the applied filter both screens share.
 */
export function DrillBreadcrumb({ scope }: { scope: ScopeKey }) {
  const drill = useFilterStore((s) => s.drills[scope]);
  const restore = useFilterStore((s) => s.restoreDrill);
  if (!drill) return null;

  return (
    <HapticPressable
      onPress={() => restore(scope)}
      haptic="none"
      accessibilityRole="button"
      accessibilityLabel={`Back to previous filter. Viewing ${drill.label}`}
      style={{
        marginTop: tokens.space[3],
        minHeight: tokens.layout.minTap,
        flexDirection: "row",
        alignItems: "center",
        gap: tokens.space[2],
      }}
    >
      <Icon name="chevron-back" size={tokens.icon.row} color={tokens.colors.accent} />
      <View style={{ flex: 1 }}>
        <AppText variant="sm" weight="semibold" style={{ color: tokens.colors.accent }}>
          Back to previous filter
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {drill.label}
        </AppText>
      </View>
    </HapticPressable>
  );
}
