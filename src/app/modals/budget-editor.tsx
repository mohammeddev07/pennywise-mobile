import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Button } from "@/shared/ui/components/Button";
import { useBudgetsStore } from "@/features/budgets/store";
import { useBooksStore } from "@/features/books/store";

function toCents(raw: string) {
  const cleaned = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToText(cents: number) {
  const v = (cents / 100).toFixed(2);
  return v;
}

export default function BudgetEditor() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { category } = useLocalSearchParams<{ category?: string }>();
  const cat = (category ?? "Uncategorized").toString();

  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const getBudgetCents = useBudgetsStore((s) => s.getBudgetCents);
  const setBudget = useBudgetsStore((s) => s.setBudget);
  const removeBudget = useBudgetsStore((s) => s.removeBudget);

  const existing = useMemo(() => getBudgetCents(selectedBookId, cat), [cat, getBudgetCents, selectedBookId]);
  const [value, setValue] = useState(existing ? centsToText(existing) : "");

  const canSave = useMemo(() => toCents(value) > 0, [value]);

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 18 }}>
      <View className="px-6 flex-row items-center justify-between">
        <HapticPressable
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </HapticPressable>

        <Text className="text-text text-base font-semibold">Budget</Text>
        <View className="h-12 w-12" />
      </View>

      <View className="px-6 mt-8">
        <Text className="text-muted text-xs">Category</Text>
        <Text className="text-text text-2xl font-semibold mt-2">{cat}</Text>

        <View className="mt-8 rounded-3xl border border-stroke bg-surface px-5 py-4">
          <Text className="text-muted text-xs">Monthly budget</Text>
          <View className="flex-row items-end mt-3">
            <Text className="text-text text-3xl font-semibold mr-2">$</Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder="0.00"
              placeholderTextColor={tokens.colors.muted}
              keyboardType="decimal-pad"
              className="text-text text-3xl font-semibold flex-1"
            />
          </View>
          <Text className="text-muted text-xs mt-3">Used to color this category green/red on Home & Categories.</Text>
        </View>

        {existing ? (
          <HapticPressable
            onPress={() => {
              removeBudget(selectedBookId, cat);
              router.back();
            }}
            haptic="impactLight"
            className="mt-6 rounded-full border border-stroke bg-ink px-5 py-3 items-center"
            android_ripple={{ color: "#FFFFFF10" }}
          >
            <Text style={{ color: tokens.colors.danger }} className="font-semibold">
              Remove budget
            </Text>
          </HapticPressable>
        ) : null}
      </View>

      <View className="px-6 mt-auto">
        <Button
          label="Save budget"
          disabled={!canSave}
          onPress={() => {
            setBudget({ bookId: selectedBookId, category: cat, budgetCents: toCents(value) });
            router.back();
          }}
        />
      </View>
    </View>
  );
}
