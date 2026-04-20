import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { Button } from "@/shared/ui/components/Button";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Sheet } from "@/shared/ui/components/Sheet";
import { AppText } from "@/shared/ui/components/AppText";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Card } from "@/shared/ui/components/Card";
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

  const existing = useAddTransactionDraftStore((s) => s.note);
  const setNote = useAddTransactionDraftStore((s) => s.setNote);

  const bookId = useAddTransactionDraftStore((s) => s.bookId);
  const kind = useAddTransactionDraftStore((s) => s.kind);
  const transactions = useTransactionsStore((s) => s.transactions);

  const persist = (useTransactionsStore as any).persist;

  const [value, setValue] = useState(existing ?? "");
  const [isHydrated, setIsHydrated] = useState<boolean>(() => {
    const has = persist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });
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
    if (!persist?.onFinishHydration) return;

    if (persist?.hasHydrated && !persist.hasHydrated()) {
      persist?.rehydrate?.();
    }

    const timeoutId = setTimeout(() => {
      if (persist?.hasHydrated && !persist.hasHydrated()) {
        setHasHydrationError(true);
      }
    }, 3000);

    const unsubHydrate = persist?.onHydrate?.(() => {
      setHasHydrationError(false);
    });

    const unsubFinish = persist.onFinishHydration(() => {
      setIsHydrated(true);
      setHasHydrationError(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubHydrate?.();
      unsubFinish?.();
    };
  }, [persist]);

  const recentNotes = useMemo(() => {
    const scoped = transactions
      .filter((tx) => tx.bookId === bookId && tx.kind === kind)
      .map((tx) => tx.note ?? "");

    return toRecentNotes(scoped);
  }, [transactions, bookId, kind]);

  const saveAndClose = () => {
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
    const has = persist?.hasHydrated?.();
    setIsHydrated(typeof has === "boolean" ? has : true);
    if (!has) {
      persist?.rehydrate?.();
    }
  };

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title="Note"
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        footer={<Button label="Done" onPress={saveAndClose} size="md" />}
      >
        <View className="mt-2">
          <AppText variant="sm" tone="muted" className="mb-2">
            Details (optional)
          </AppText>

          <View className="rounded-lg border border-stroke bg-surface px-4 pt-4 pb-3">
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={(next) => setValue(clampNote(next))}
              placeholder="Add context for this transaction"
              placeholderTextColor={tokens.colors.muted}
              className="text-text"
              multiline
              textAlignVertical="top"
              style={[tokens.typography.base as any, { minHeight: 160 }]}
              returnKeyType="done"
              blurOnSubmit
              maxLength={NOTE_MAX}
            />

            <View className="mt-3 flex-row items-center justify-between">
              <AppText variant="xs" tone="muted">
                Saved automatically
              </AppText>
              <AppText variant="xs" tone="muted">
                {value.length}/{NOTE_MAX}
              </AppText>
            </View>
          </View>
        </View>

        <View className="mt-6">
          <AppText variant="xs" tone="muted" className="uppercase">
            Recent notes
          </AppText>

          {hasHydrationError ? (
            <Card variant="surface" className="mt-3">
              <AppText variant="base">Couldn&apos;t load recent notes.</AppText>
              <AppText variant="sm" tone="muted" className="mt-2">
                Retry to refresh persisted transactions.
              </AppText>
              <Button label="Retry" size="md" variant="ghost" onPress={retryHydration} className="mt-4" />
            </Card>
          ) : !isHydrated ? (
            <View className="mt-3 gap-3">
              <Skeleton height={44} borderRadius={16} />
              <Skeleton height={44} borderRadius={16} />
            </View>
          ) : recentNotes.length === 0 ? (
            <View className="mt-3 py-6">
              <EmptyState
                title="No recent notes"
                message="Recent notes from this book and type will appear here."
                className="px-0"
              />
            </View>
          ) : (
            <View className="mt-3">
              <AppText variant="xs" tone="muted">
                Tap to append to your current note.
              </AppText>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingTop: 12 }}
              >
                {recentNotes.map((item) => (
                  <HapticPressable
                    key={item}
                    onPress={() => onAppendRecent(item)}
                    className="mr-3 min-h-11 justify-center rounded-full border border-stroke bg-surface px-4"
                    android_ripple={{ color: "#FFFFFF10", borderless: true }}
                  >
                    <AppText variant="sm">{item}</AppText>
                  </HapticPressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Sheet>
    </View>
  );
}
