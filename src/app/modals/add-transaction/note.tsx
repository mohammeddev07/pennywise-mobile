import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/shared/ui/components/Button";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { tokens } from "@/shared/ui/theme/tokens";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { useTransactionsStore } from "@/features/transactions/store";

const NOTE_MAX = 400;

function clampNote(value: string) {
  return value.slice(0, NOTE_MAX);
}

function toRecentNotes(notes: string[]) {
  const seen = new Set<string>();
  return notes
    .map((n) => n.trim())
    .filter((n) => n.length > 0)
    .filter((n) => {
      const key = n.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

export default function NoteModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const existing = useAddTransactionDraftStore((s) => s.note);
  const setNote = useAddTransactionDraftStore((s) => s.setNote);

  const bookId = useAddTransactionDraftStore((s) => s.bookId);
  const kind = useAddTransactionDraftStore((s) => s.kind);
  const transactions = useTransactionsStore((s) => s.transactions);

  const [value, setValue] = useState(existing ?? "");
  const [isHydrated, setIsHydrated] = useState(useTransactionsStore.persist.hasHydrated());
  const [hasHydrationError, setHasHydrationError] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setNote(clampNote(value));
  }, [setNote, value]);

  useEffect(() => {
    if (isHydrated) return;

    const timeoutId = setTimeout(() => {
      if (!useTransactionsStore.persist.hasHydrated()) {
        setHasHydrationError(true);
      }
    }, 3000);

    const unsubHydrate = useTransactionsStore.persist.onHydrate(() => {
      setHasHydrationError(false);
    });

    const unsubFinish = useTransactionsStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
      setHasHydrationError(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubHydrate();
      unsubFinish();
    };
  }, [isHydrated]);

  const recentNotes = useMemo(() => {
    const scoped = transactions
      .filter((tx) => tx.bookId === bookId && tx.kind === kind)
      .map((tx) => tx.note ?? "");

    return toRecentNotes(scoped);
  }, [transactions, bookId, kind]);

  const canSave = value.trim().length <= NOTE_MAX;

  const saveAndClose = () => {
    if (!canSave) return;
    setNote(clampNote(value.trim()));
    Keyboard.dismiss();
    router.back();
  };

  const onAppendRecent = (next: string) => {
    setValue((prev) => {
      const current = (prev ?? "").trim();
      const appended = current.length > 0 ? `${current}${current.endsWith(".") ? "" : "."} ${next}` : next;
      return clampNote(appended);
    });
  };

  const retryHydration = () => {
    setHasHydrationError(false);
    setIsHydrated(useTransactionsStore.persist.hasHydrated());
  };

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}>
      <View className="px-6 flex-row items-center justify-between">
        <HapticPressable
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </HapticPressable>

        <Text className="text-text text-base font-semibold">Note</Text>

        <View className="h-12 w-12" />
      </View>

      <View className="flex-1 px-6 mt-6">
        <Text className="text-muted text-xs">Details (optional)</Text>
        <View className="mt-2 rounded-xl border border-stroke bg-surface p-4">
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={(next) => setValue(clampNote(next))}
            placeholder="Add context for this transaction"
            placeholderTextColor={tokens.colors.muted}
            className="text-text text-base"
            multiline
            textAlignVertical="top"
            style={{ minHeight: 160 }}
            returnKeyType="done"
            blurOnSubmit
            maxLength={NOTE_MAX}
          />

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-muted text-xs">Saved automatically</Text>
            <Text className="text-muted text-xs">{value.length}/{NOTE_MAX}</Text>
          </View>
        </View>

        <View className="mt-6">
          <Text className="text-muted text-xs uppercase" style={{ letterSpacing: 0.8 }}>
            Recent notes
          </Text>

          {hasHydrationError ? (
            <View className="mt-3 rounded-xl border border-stroke bg-surface p-4">
              <Text className="text-text text-sm">Couldn&apos;t load recent notes.</Text>
              <Button label="Retry" size="md" variant="ghost" onPress={retryHydration} className="mt-3" />
            </View>
          ) : !isHydrated ? (
            <View className="mt-3 gap-3">
              <Skeleton height={44} borderRadius={16} />
              <Skeleton height={44} borderRadius={16} />
            </View>
          ) : recentNotes.length === 0 ? (
            <View className="mt-3 rounded-xl border border-stroke bg-surface p-4">
              <Text className="text-muted text-sm">No recent notes for this book and type yet.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 12 }}>
              {recentNotes.map((item) => (
                <HapticPressable
                  key={item}
                  onPress={() => onAppendRecent(item)}
                  className="mr-3 min-h-11 justify-center rounded-full border border-stroke bg-surface px-4"
                  android_ripple={{ color: "#FFFFFF10", borderless: true }}
                >
                  <Text className="text-text text-sm font-medium">{item}</Text>
                </HapticPressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      <View className="px-6">
        <Button label="Done" onPress={saveAndClose} disabled={!canSave} />
      </View>
    </View>
  );
}
