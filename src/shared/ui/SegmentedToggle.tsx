import React from "react";
import { Pressable, Text, View } from "react-native";

type Value = "expense" | "income";

export function SegmentedToggle({
  value,
  onChange
}: {
  value: Value;
  onChange: (v: Value) => void;
}) {
  return (
    <View className="flex-row rounded-full bg-zinc-900 p-1" style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
      <SegBtn label="Expense" active={value === "expense"} onPress={() => onChange("expense")} />
      <SegBtn label="Income" active={value === "income"} onPress={() => onChange("income")} />
    </View>
  );
}

function SegBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`px-4 py-2 rounded-full ${active ? "bg-emerald-400" : ""}`}>
      <Text className={`text-xs font-semibold ${active ? "text-black" : "text-zinc-400"}`}>{label}</Text>
    </Pressable>
  );
}
