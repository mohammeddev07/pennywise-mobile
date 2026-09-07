import { View } from "react-native";
import { tokens } from "@/shared/ui/theme/tokens";

export function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <View className="flex-row justify-center">
      {Array.from({ length }).map((_, i) => (
        <View
          key={`dot-${i}`}
          style={{
            width: 64,
            height: 64,
            borderRadius: tokens.radii.md,
            marginHorizontal: 6,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: tokens.colors.stroke,
            backgroundColor: tokens.colors.surface,
            ...tokens.elevation.card.ios,
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: tokens.radii.pill,
              backgroundColor: i < filled ? tokens.colors.accent : "transparent",
            }}
          />
        </View>
      ))}
    </View>
  );
}
