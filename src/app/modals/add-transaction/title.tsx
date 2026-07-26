import { useEffect, useMemo, useState } from "react";
import { Keyboard, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Sheet } from "@/shared/ui/components/Sheet";
import { AppText } from "@/shared/ui/components/AppText";
import { Input } from "@/shared/ui/components/Input";
import { Button } from "@/shared/ui/components/Button";
import { Skeleton } from "@/shared/ui/components/Skeleton";

import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { useTransactionsStore } from "@/features/transactions/store";

function safeTime(iso?: string) {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export default function TitleModal() {
  const router = useRouter();

  const existing = useAddTransactionDraftStore((s) => s.title);
  const setTitle = useAddTransactionDraftStore((s) => s.setTitle);
  const bookId = useAddTransactionDraftStore((s) => s.bookId);
  const kind = useAddTransactionDraftStore((s) => s.kind);

  const transactions = useTransactionsStore((s) => s.transactions);

  // Persist hydration (Loading state for "Recent")
  const persist = (useTransactionsStore as any).persist;
  const [hydrated, setHydrated] = useState<boolean>(() => {
    const has = persist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });

  useEffect(() => {
    if (!persist?.onFinishHydration) return;
    const unsub = persist.onFinishHydration(() => setHydrated(true));
    // in case hydration hasn't started yet
    if (persist?.hasHydrated && !persist.hasHydrated()) {
      persist?.rehydrate?.();
    }
    return () => unsub?.();
  }, [persist]);

  const [value, setValue] = useState(existing ?? "");
  const trimmedTitle = value.trim();
  const canSave = trimmedTitle.length > 0;

  // auto-save while typing (keeps draft in sync)
  useEffect(() => {
    setTitle(value);
  }, [setTitle, value]);

  const recentTitles = useMemo(() => {
    const seen = new Set<string>();
    return [...transactions]
      .filter((t) => t.bookId === bookId && t.type === kind)
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
    if (!canSave) return;
    setTitle(trimmedTitle);
    Keyboard.dismiss();
    router.back();
  };

  const pick = (t: string) => {
    setValue(t);
    setTitle(t);
    Keyboard.dismiss();
    router.back();
  };

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title="Title"
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#0B122012", borderless: true }}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        rightAction={
          <HapticPressable
            onPress={saveAndClose}
            disabled={!canSave}
            haptic="selection"
            pressScale={0.98}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#0B122012", borderless: true }}
          >
            <Ionicons name="checkmark" size={18} color={tokens.colors.accent} />
          </HapticPressable>
        }
        footer={<Button label="Done" onPress={saveAndClose} size="md" disabled={!canSave} />}
      >
        {/* Input block */}
        <View className="mt-2">
          <Input
            label="Title"
            value={value}
            onChangeText={setValue}
            placeholder="Coffee, Uber, Rent…"
            autoFocus
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={saveAndClose}
            error={!canSave ? "Title is required." : undefined}
            // Make the title feel “headline-like” without breaking contract tokens
            style={[tokens.typography.xl as any, { fontFamily: "Inter_600SemiBold" }]}
          />

          <AppText variant="xs" tone="muted" className="mt-3">
            Shows in Home and Transactions.
          </AppText>
        </View>

        {/* Recent titles */}
        <View className="mt-6">
          <AppText variant="xs" tone="muted" className="uppercase mb-3">
            Recent
          </AppText>

          {!hydrated ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">
                <View className="mr-3">
                  <Skeleton height={44} width={110} borderRadius={24} />
                </View>
                <View className="mr-3">
                  <Skeleton height={44} width={140} borderRadius={24} />
                </View>
                <View className="mr-3">
                  <Skeleton height={44} width={90} borderRadius={24} />
                </View>
              </View>
            </ScrollView>
          ) : recentTitles.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View className="flex-row">
                {recentTitles.map((t) => (
                  <HapticPressable
                    key={t}
                    onPress={() => pick(t)}
                    haptic="selection"
                    pressScale={0.99}
                    className="mr-3 h-11 px-4 rounded-full border border-stroke bg-surface items-center justify-center"
                    android_ripple={{ color: "#0B122012", borderless: true }}
                  >
                    <AppText variant="sm" style={{ fontFamily: "Inter_600SemiBold" }}>
                      {t}
                    </AppText>
                  </HapticPressable>
                ))}
              </View>
            </ScrollView>
          ) : (
            <AppText variant="sm" tone="muted">
              No recent titles yet.
            </AppText>
          )}
        </View>
      </Sheet>
    </View>
  );
}
