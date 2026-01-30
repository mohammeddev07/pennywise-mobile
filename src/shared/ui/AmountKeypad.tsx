import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export type AmountKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back";

export function AmountKeypad({
  onKey,
  disabled,
}: {
  onKey: (k: AmountKey) => void;
  disabled?: boolean;
}) {
  const press = async (k: AmountKey) => {
    if (disabled) return;
    await Haptics.selectionAsync().catch(() => {});
    onKey(k);
  };

  return (
    <View className="w-full px-6 pb-6">
      <KeyRow>
        <KeyBtn label="1" onPress={() => press("1")} />
        <KeyBtn label="2" onPress={() => press("2")} />
        <KeyBtn label="3" onPress={() => press("3")} />
      </KeyRow>
      <KeyRow>
        <KeyBtn label="4" onPress={() => press("4")} />
        <KeyBtn label="5" onPress={() => press("5")} />
        <KeyBtn label="6" onPress={() => press("6")} />
      </KeyRow>
      <KeyRow>
        <KeyBtn label="7" onPress={() => press("7")} />
        <KeyBtn label="8" onPress={() => press("8")} />
        <KeyBtn label="9" onPress={() => press("9")} />
      </KeyRow>
      <KeyRow>
        <KeyBtn label="." onPress={() => press(".")} />
        <KeyBtn label="0" onPress={() => press("0")} />
        <Pressable
          onPress={() => press("back")}
          disabled={disabled}
          hitSlop={10}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          className="flex-1 aspect-square items-center justify-center rounded-full"
        >
          <Ionicons name="backspace-outline" size={26} color="#00C805" />
        </Pressable>
      </KeyRow>
    </View>
  );
}

function KeyRow({ children }: { children: React.ReactNode }) {
  return <View className="flex-row items-center gap-4">{children}</View>;
}

function KeyBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
      className="flex-1 aspect-square items-center justify-center rounded-full"
    >
      <Text className="text-accent text-4xl font-semibold">{label}</Text>
    </Pressable>
  );
}
