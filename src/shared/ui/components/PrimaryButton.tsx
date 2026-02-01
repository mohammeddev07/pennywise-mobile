import React from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

type Props = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
};

export function PrimaryButton({ label, onPress, icon = "check" }: Props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const bg = isDark ? "#10b981" : "#2b4bee";

  return (
    <Pressable onPress={onPress} className="w-full" style={({ pressed }) => [{ transform: [{ translateY: pressed ? 4 : 0 }] }]}>
      {({ pressed }) => (
        <View
          className="h-16 w-full flex-row items-center justify-center rounded-2xl"
          style={{
            backgroundColor: bg,
            shadowOpacity: pressed ? 0 : 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 6 },
            elevation: pressed ? 0 : 6
          }}
        >
          <Text className="text-lg font-bold text-white">{label}</Text>
          <MaterialIcons name={icon} size={20} color="rgba(255,255,255,0.9)" style={{ marginLeft: 8 }} />
        </View>
      )}
    </Pressable>
  );
}
