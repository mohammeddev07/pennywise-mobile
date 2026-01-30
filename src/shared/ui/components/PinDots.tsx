import { View } from "react-native";
import { tokens } from "@/shared/ui/theme/tokens";

export function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <View className="flex-row justify-center">
      {Array.from({ length }).map((_, i) => (
        <View
          key={`dot-${i}`}
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            marginHorizontal: 8,
            backgroundColor: i < filled ? tokens.colors.accent : tokens.colors.stroke
          }}
        />
      ))}
    </View>
  );
}
