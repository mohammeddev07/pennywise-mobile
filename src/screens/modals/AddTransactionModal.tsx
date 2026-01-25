import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Screen } from "../../components/Screen";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SegmentedControl } from "../../components/SegmentedControl";
import { qk } from "../../api/queryKeys";
import { createTransaction, listCategories } from "../../api/mockApi";
import { useAppStore } from "../../state/appStore";
import type { TransactionType } from "../../types/dto";

export function AddTransactionModal({ navigation, route }: any) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const bookId = useAppStore((s) => s.selectedBookId)!;

  const presetType: TransactionType = route?.params?.presetType ?? "EXPENSE";

  const [type, setType] = useState<TransactionType>(presetType);
  const [amountText, setAmountText] = useState("50.00");
  const [selectedCategoryId, setSelectedCategoryId] = useState("c_food");
  const [dateText, setDateText] = useState("Today, 24 Oct");
  const [note, setNote] = useState("");

  const qc = useQueryClient();
  const catQ = useQuery({ queryKey: qk.categories(bookId), queryFn: () => listCategories(bookId) });

  const cats = useMemo(() => (catQ.data?.items ?? []).filter((c) => c.type === type), [catQ.data, type]);

  const mutation = useMutation({
    mutationFn: () =>
      createTransaction({
        bookId,
        type,
        amountMinor: Math.max(1, Math.round(Number(amountText || "0") * 100)),
        occurredOn: "2026-04-24",
        categoryId: selectedCategoryId,
        note
      }),
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: qk.transactions(bookId) }), qc.invalidateQueries({ queryKey: qk.balance(bookId) })]);
      navigation.goBack();
    }
  });

  const headerText = isDark ? "text-white" : "text-textLight";
  const mutedText = isDark ? "text-slate-500" : "text-slate-400";

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-6 pb-2 pt-10">
          <Pressable
            onPress={() => navigation.goBack()}
            className={`h-10 w-10 items-center justify-center rounded-full shadow-sm ${isDark ? "bg-cardDark" : "bg-white"}`}
            android_ripple={{ color: isDark ? "#ffffff10" : "#00000010", borderless: true }}
          >
            <MaterialIcons name="close" size={22} color={isDark ? "#fff" : "#0f172a"} />
          </Pressable>

          <Text className={`flex-1 pr-10 text-center text-lg font-bold ${headerText}`}>
            {type === "EXPENSE" ? "Add Expense" : "Add Income"}
          </Text>

          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Amount hero */}
          <View className="items-center justify-center py-10">
            <Text className={`mb-2 text-sm font-medium uppercase tracking-wide ${mutedText}`}>Enter Amount</Text>
            <View className="flex-row items-end">
              <Text className={`mr-1 pb-2 text-4xl font-bold ${headerText}`}>$</Text>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                className={`max-w-[280px] bg-transparent p-0 text-center text-[56px] font-bold leading-none tracking-tight ${headerText}`}
                placeholder="0.00"
                placeholderTextColor={isDark ? "#475569" : "#cbd5e1"}
              />
            </View>

            {/* Minimal type toggle (requested if not shown) */}
            <View className="mt-6 w-full">
              <SegmentedControl
                options={[
                  { label: "Expense", value: "EXPENSE" },
                  { label: "Income", value: "INCOME" }
                ]}
                value={type}
                onChange={(v) => {
                  setType(v as TransactionType);
                  const nextCats = (catQ.data?.items ?? []).filter((c) => c.type === (v as TransactionType));
                  setSelectedCategoryId(nextCats[0]?.id ?? "c_food");
                }}
              />
            </View>
          </View>

          {/* Category */}
          <View className="mb-8">
            <View className="mb-3 flex-row items-center justify-between px-1">
              <Text className={`text-base font-semibold ${headerText}`}>Category</Text>
              <Pressable>
                <Text className={`${isDark ? "text-primary" : "text-primaryLight"} text-sm font-medium`}>See all</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
              {cats.map((c) => {
                const active = c.id === selectedCategoryId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedCategoryId(c.id)}
                    className={`h-11 flex-row items-center justify-center rounded-full px-5 shadow-sm ${active ? (isDark ? "bg-primary" : "bg-primaryLight") : isDark ? "bg-cardDark border border-gray-700/50" : "bg-white"}`}
                    android_ripple={{ color: active ? "#ffffff20" : isDark ? "#ffffff10" : "#00000010", borderless: true }}
                  >
                    <MaterialIcons
                      name={c.name === "Food" ? "restaurant" : c.name === "Rent" ? "home" : c.name === "Fuel" ? "local-gas-station" : c.name === "Shopping" ? "shopping-bag" : "category"}
                      size={20}
                      color={active ? "#fff" : isDark ? "#94a3b8" : "#64748b"}
                      style={{ marginRight: 8 }}
                    />
                    <Text className={`text-sm font-medium ${active ? "text-white" : isDark ? "text-slate-300" : "text-slate-600"}`}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Inputs */}
          <View className="mb-8 gap-5">
            <View>
              <Text className={`mb-2 ml-1 text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Date</Text>
              <View className={`relative flex-row items-center rounded-2xl border border-transparent shadow-sm ${isDark ? "bg-cardDark" : "bg-white"}`}>
                <TextInput
                  value={dateText}
                  onChangeText={setDateText}
                  className={`h-14 w-full rounded-2xl bg-transparent pl-5 pr-12 font-medium ${headerText}`}
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                />
                <View className="absolute right-4">
                  <MaterialIcons name="calendar-today" size={20} color={isDark ? "#10b981" : "#2b4bee"} />
                </View>
              </View>
            </View>

            <View>
              <Text className={`mb-2 ml-1 text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Note</Text>
              <View className={`relative flex-row items-center rounded-2xl border border-transparent shadow-sm ${isDark ? "bg-cardDark" : "bg-white"}`}>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  className={`h-14 w-full rounded-2xl bg-transparent pl-5 pr-12 font-medium ${headerText}`}
                  placeholder="What was this for?"
                  placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
                />
                <View className="absolute right-4">
                  <MaterialIcons name="edit-note" size={22} color={isDark ? "#94a3b8" : "#94a3b8"} />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View className="px-6 pb-10">
          <PrimaryButton label={mutation.isPending ? "Saving..." : "Save Transaction"} onPress={() => mutation.mutate()} icon="check" />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
