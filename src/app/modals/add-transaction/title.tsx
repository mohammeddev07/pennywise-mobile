import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { useTransactionsStore } from "@/features/transactions/store";

function safeTime(iso?: string) {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export default function TitleModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const existing = useAddTransactionDraftStore((s) => s.title);
  const setTitle = useAddTransactionDraftStore((s) => s.setTitle);
  const bookId = useAddTransactionDraftStore((s) => s.bookId);
  const kind = useAddTransactionDraftStore((s) => s.kind);

  const transactions = useTransactionsStore((s) => s.transactions);

  const [value, setValue] = useState(existing ?? "");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  // auto-save while typing
  useEffect(() => {
    setTitle(value);
  }, [setTitle, value]);

  const recentTitles = useMemo(() => {
    const seen = new Set<string>();
    return [...transactions]
      .filter((t) => t.bookId === bookId && t.kind === kind)
      .sort((a, b) => safeTime(b.occurredAt) - safeTime(a.occurredAt))
      .map((t) => (t.title || "").trim())
      .filter((t) => t.length > 0)
      .filter((t) => {
        if (seen.has(t)) return false;
        seen.add(t);
        return true;
      })
      .slice(0, 10);
  }, [transactions, bookId, kind]);

  const saveAndClose = () => {
    setTitle(value.trim());
    Keyboard.dismiss();
    router.back();
  };

  const pick = (t: string) => {
    Haptics.selectionAsync().catch(() => {});
    setValue(t);
    setTitle(t);
    Keyboard.dismiss();
    router.back();
  };

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 18 }}>
      {/* Header */}
      <View className="px-6 flex-row items-center justify-between">
        <HapticPressable
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </HapticPressable>

        <Text className="text-text font-semibold">Title</Text>

        <HapticPressable
          onPress={saveAndClose}
          haptic="selection"
          pressScale={0.97}
          className="h-12 px-5 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12" }}
        >
          <Text style={{ color: tokens.colors.accent }} className="font-semibold">
            Save
          </Text>
        </HapticPressable>
      </View>

      <View className="px-6 mt-10">
        <Text className="text-muted text-xs">Transaction title</Text>

        <View className="mt-3 rounded-3xl border border-stroke bg-surface px-5 py-4">
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={setValue}
            placeholder="Coffee, Uber, Rent…"
            placeholderTextColor={tokens.colors.muted}
            className="text-text text-xl font-semibold"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={saveAndClose}
          />
          <Text className="text-muted text-xs mt-3">Shows in Home and Transactions.</Text>
        </View>

        {/* Recent titles */}
        {recentTitles.length > 0 ? (
          <View className="mt-7">
            <Text className="text-muted text-xs uppercase tracking-widest mb-3">Recent</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentTitles.map((t) => (
                <HapticPressable
                  key={t}
                  onPress={() => pick(t)}
                  haptic="selection"
                  pressScale={0.98}
                  className="mr-3 rounded-full border border-stroke bg-surface px-4 py-2"
                  android_ripple={{ color: "#FFFFFF10", borderless: true }}
                >
                  <Text className="text-text font-semibold">{t}</Text>
                </HapticPressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      <View className="px-6 mt-auto">
        <HapticPressable
          onPress={saveAndClose}
          haptic="impactLight"
          pressScale={0.99}
          className="h-12 items-center justify-center rounded-full bg-accent"
          android_ripple={{ color: "#00000022" }}
        >
          <Text className="text-black font-semibold">Done</Text>
        </HapticPressable>
      </View>
    </View>
  );
}
