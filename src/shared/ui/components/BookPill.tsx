import { Text, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

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
      pressScale={0.96}
      className="rounded-full border border-stroke bg-surface"
      android_ripple={{ color: "#FFFFFF10", borderless: true }}
      style={[
        {
          height: 44,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
        },
        style,
      ]}
    >
      <Text
        className="text-text font-semibold"
        style={{
          includeFontPadding: false as any,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>

      <View style={{ width: 8 }} />

      <Ionicons name="chevron-down" size={16} color={tokens.colors.accent} />
    </HapticPressable>
  );
}

export default BookPill;
