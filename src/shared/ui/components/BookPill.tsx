import { View, type ViewStyle } from "react-native";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { Icon } from "./Icon";

export function BookPill({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <HapticPressable
      onPress={onPress}
      haptic="none"
      pressScale={0.98}
      className="rounded-full border border-stroke bg-surface"
      android_ripple={{ color: tokens.colors.ripple, borderless: true }}
      style={[
        {
          height: 46,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
        },
        style,
      ]}
    >
      <AppText variant="sm" weight="semibold" numberOfLines={1}>
        {label}
      </AppText>

      <View style={{ width: 8 }} />

      <Icon name="chevron-down" size={16} color={tokens.colors.accent} />
    </HapticPressable>
  );
}

export default BookPill;
