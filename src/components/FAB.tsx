import React from "react";
import { Pressable, ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export function FAB({ onPress, style }: { onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={style}>
      <MaterialIcons name="add" size={28} color="#fff" />
    </Pressable>
  );
}
