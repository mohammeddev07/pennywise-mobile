import { View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";

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
      haptic="selection"
      pressScale={0.98}
      className="rounded-full border border-stroke bg-surface"
      android_ripple={{ color: "#0B122012", borderless: true }}
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

      <Ionicons name="chevron-down" size={16} color={tokens.colors.accent} />
    </HapticPressable>
  );
}

export default BookPill;
