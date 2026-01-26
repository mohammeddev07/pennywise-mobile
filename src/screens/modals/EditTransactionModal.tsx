import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Screen } from "../../components/Screen";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SegmentedControl } from "../../components/SegmentedControl";
import { qk } from "../../api/queryKeys";
import { deleteTransaction, listCategories, listTransactions, updateTransaction } from "../../api/mockApi";
import { useAppStore } from "../../state/appStore";
import type { TransactionType } from "../../types/dto";

export function EditTransactionModal({ navigation, route }: any) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const bookId = useAppStore((s) => s.selectedBookId)!;
  const txId: string = route?.params?.txId;

  const qc = useQueryClient();
  const txQ = useQuery({ queryKey: qk.transactions(bookId), queryFn: () => listTransactions(bookId) });
  const catQ = useQuery({ queryKey: qk.categories(bookId), queryFn: () => listCategories(bookId) });

  const tx = useMemo(() => txQ.data?.page.items.find((t) => t.id === txId), [txQ.data, txId]);

  const [type, setType] = useState<TransactionType>(tx?.type ?? "EXPENSE");
  const [amountText, setAmountText] = useState(((tx?.amountMinor ?? 0) / 100).toFixed(2));
  const [selectedCategoryId, setSelectedCategoryId] = useState(tx?.category.id ?? "c_food");
  const [note, setNote] = useState(tx?.note ?? "");

  const cats = useMemo(() => (catQ.data?.items ?? []).filter((c) => c.type === type), [catQ.data, type]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateTransaction({
        bookId,
        txId,
        patch: {
          type,
          amountMinor: Math.max(1, Math.round(Number(amountText || "0") * 100)),
          categoryId: selectedCategoryId,
          note
        }
      }),
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: qk.transactions(bookId) }), qc.invalidateQueries({ queryKey: qk.balance(bookId) })]);
      navigation.goBack();
    }
  });

  const delMutation = useMutation({
    mutationFn: () => deleteTransaction({ bookId, txId }),
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: qk.transactions(bookId) }), qc.invalidateQueries({ queryKey: qk.balance(bookId) })]);
      navigation.goBack();
    }
  });

  const headerText = isDark ? "text-white" : "text-textLight";

  if (!tx) {
    return (
      <Screen className="items-center justify-center">
        <Text className={headerText}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="flex-row items-center justify-between px-6 pb-2 pt-10">
          <Pressable
            onPress={() => navigation.goBack()}
            className={`h-10 w-10 items-center justify-center rounded-full shadow-sm ${isDark ? "bg-cardDark" : "bg-white"}`}
          >
            <MaterialIcons name="close" size={22} color={isDark ? "#fff" : "#0f172a"} />
          </Pressable>

          <Text className={`flex-1 pr-10 text-center text-lg font-bold ${headerText}`}>Edit Transaction</Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="items-center justify-center py-6">
            <View className="flex-row items-end">
              <Text className={`mr-1 pb-2 text-4xl font-bold ${headerText}`}>$</Text>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                className={`max-w-[280px] bg-transparent p-0 text-center text-[56px] font-bold leading-none tracking-tight ${headerText}`}
              />
            </View>

            <View className="mt-5 w-full">
              <SegmentedControl
                options={[
                  { label: "Expense", value: "EXPENSE" },
                  { label: "Income", value: "INCOME" }
                ]}
                value={type}
                onChange={(v) => setType(v as TransactionType)}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className={`mb-2 text-base font-semibold ${headerText}`}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
              {cats.map((c) => {
                const active = c.id === selectedCategoryId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedCategoryId(c.id)}
                    className={`h-11 flex-row items-center justify-center rounded-full px-5 shadow-sm ${active ? (isDark ? "bg-primary" : "bg-primaryLight") : isDark ? "bg-cardDark border border-gray-700/50" : "bg-white"}`}
                  >
                    <Text className={`text-sm font-medium ${active ? "text-white" : isDark ? "text-slate-300" : "text-slate-600"}`}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
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

          <Pressable
            onPress={() => {
              Alert.alert("Delete transaction?", "This cannot be undone in the UI mock.", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => delMutation.mutate() }
              ]);
            }}
            className={`mt-6 h-12 items-center justify-center rounded-2xl ${isDark ? "bg-red-500/15" : "bg-red-50"}`}
          >
            <Text className="text-sm font-bold text-red-500">{delMutation.isPending ? "Deleting..." : "Delete"}</Text>
          </Pressable>
        </ScrollView>

        <View className="px-6 pb-10">
          <PrimaryButton label={saveMutation.isPending ? "Saving..." : "Save Changes"} onPress={() => saveMutation.mutate()} icon="check" />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
