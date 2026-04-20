import { useEffect, useMemo, useState } from "react";
import { Keyboard, Platform, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { format, parseISO } from "date-fns";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { Sheet } from "@/shared/ui/components/Sheet";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { AmountInput, applyAmountKey } from "@/shared/ui/components/AmountInput";
import { NumericKeypad, type Key } from "@/shared/ui/NumericKeypad";
import { Input } from "@/shared/ui/components/Input";
import { SelectRow } from "@/shared/ui/components/SelectRow";
import { Button } from "@/shared/ui/components/Button";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { useTransactionsStore, type TransactionKind } from "@/features/transactions/store";
import { useCategoriesStore } from "@/features/categories/store";
import { currencySymbol, formatCurrency } from "@/shared/utils/formatCurrency";

function centsToAmount(cents: number) {
  const amount = Math.abs(cents) / 100;
  return amount % 1 === 0 ? String(amount.toFixed(0)) : amount.toFixed(2);
}

function parseAmountToCents(raw: string) {
  const cleaned = String(raw || "0")
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function parseWhen(iso: string) {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return new Date();
    return d;
  } catch {
    return new Date();
  }
}

function CategoryChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <HapticPressable
      onPress={onPress}
      haptic="selection"
      pressScale={0.98}
      className="mr-3 min-h-11 rounded-full border px-4 items-center justify-center"
      style={{
        borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
        backgroundColor: active ? `${tokens.colors.accent}18` : tokens.colors.surface,
      }}
      android_ripple={{ color: "#FFFFFF10", borderless: true }}
    >
      <AppText variant="sm" style={{ color: active ? tokens.colors.accent : tokens.colors.text }}>
        {label}
      </AppText>
    </HapticPressable>
  );
}

export default function EditTransactionModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const transactions = useTransactionsStore((s) => s.transactions);
  const updateTransaction = useTransactionsStore((s) => s.updateTransaction);
  const categories = useCategoriesStore((s) => s.categories);

  const txPersist = (useTransactionsStore as any).persist;
  const [hydrated, setHydrated] = useState<boolean>(() => txPersist?.hasHydrated?.() ?? true);
  const [hydrationError, setHydrationError] = useState(false);

  useEffect(() => {
    if (!txPersist?.onFinishHydration) return;
    const unsub = txPersist.onFinishHydration(() => {
      setHydrated(true);
      setHydrationError(false);
    });
    if (txPersist?.hasHydrated && !txPersist.hasHydrated()) txPersist?.rehydrate?.();
    const timeoutId = setTimeout(() => {
      if (txPersist?.hasHydrated && !txPersist.hasHydrated()) setHydrationError(true);
    }, 3000);
    return () => {
      clearTimeout(timeoutId);
      unsub?.();
    };
  }, [txPersist]);

  const tx = useMemo(() => transactions.find((item) => item.id === id) ?? null, [id, transactions]);

  const [amount, setAmount] = useState("0");
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Uncategorized");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showMode, setShowMode] = useState<"date" | "time" | null>(null);
  const [attemptedSave, setAttemptedSave] = useState(false);

  useEffect(() => {
    if (!tx) return;
    setAmount(centsToAmount(tx.amountCents));
    setKind(tx.kind);
    setTitle(tx.title === tx.category ? "" : tx.title);
    setCategory(tx.category || "Uncategorized");
    setNote(tx.note ?? "");
    setOccurredAt(parseWhen(tx.occurredAt));
  }, [tx]);

  const amountCents = useMemo(() => parseAmountToCents(amount), [amount]);
  const canSave = !!tx && amountCents > 0;

  const categoryOptions = useMemo(() => {
    const names = new Set<string>(["Uncategorized", category]);
    for (const c of categories) names.add(c.name);
    for (const item of transactions) {
      if (tx && item.bookId === tx.bookId && item.category) names.add(item.category);
    }
    return Array.from(names).filter(Boolean);
  }, [categories, category, transactions, tx]);

  const onKey = (k: Key) => setAmount((prev) => applyAmountKey(prev, k));

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowMode(null);
    if (!selected) return;
    setOccurredAt(selected);
  };

  const onSave = () => {
    setAttemptedSave(true);
    if (!tx || amountCents <= 0) return;

    const ok = updateTransaction(tx.id, {
      kind,
      amountCents,
      title: title.trim(),
      category: category.trim() || "Uncategorized",
      note: note.trim(),
      occurredAt: occurredAt.toISOString(),
    });

    if (ok) {
      Keyboard.dismiss();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    }
  };

  const retryHydration = () => {
    setHydrationError(false);
    setHydrated(txPersist?.hasHydrated?.() ?? true);
    txPersist?.rehydrate?.();
  };

  return (
    <View className="flex-1 bg-ink">
      <Sheet
        tone="ink"
        className="flex-1"
        title="Edit transaction"
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        footer={
          tx ? (
            <View>
              <Button label="Save changes" onPress={onSave} disabled={!canSave} size="md" />
              <View className="mt-2">
                <NumericKeypad onKey={onKey} keyHeight={52} containerClassName="px-2" />
              </View>
            </View>
          ) : (
            <Button label="Done" onPress={() => router.back()} size="md" />
          )
        }
      >
        {hydrationError ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="Couldn’t load transaction"
              message="Retry to continue editing."
              actionLabel="Retry"
              onAction={retryHydration}
              className="px-0"
            />
          </View>
        ) : !hydrated ? (
          <View className="mt-2 gap-3">
            <Skeleton height={160} borderRadius={24} />
            <Skeleton height={260} borderRadius={24} />
          </View>
        ) : !tx ? (
          <View className="flex-1 justify-center">
            <EmptyState title="Transaction not found" message="It may have been deleted." className="px-0" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View className="items-center mt-2">
              <View className="flex-row rounded-full border border-stroke bg-surface overflow-hidden">
                <HapticPressable
                  onPress={() => setKind("expense")}
                  haptic="selection"
                  pressScale={0.99}
                  className={`px-6 h-12 items-center justify-center ${kind === "expense" ? "bg-card" : ""}`}
                >
                  <AppText variant="sm" className={kind === "expense" ? "text-text" : "text-muted"}>
                    Expense
                  </AppText>
                </HapticPressable>
                <HapticPressable
                  onPress={() => setKind("income")}
                  haptic="selection"
                  pressScale={0.99}
                  className={`px-6 h-12 items-center justify-center ${kind === "income" ? "bg-card" : ""}`}
                >
                  <AppText variant="sm" className={kind === "income" ? "text-text" : "text-muted"}>
                    Income
                  </AppText>
                </HapticPressable>
              </View>

              <View className="mt-7 w-full">
                <AmountInput
                  value={amount}
                  kind={kind}
                  currencySymbol={currencySymbol(tx.currency)}
                  helperText={formatCurrency(amountCents, tx.currency)}
                  error={attemptedSave && amountCents <= 0 ? "Amount must be greater than zero." : undefined}
                />
              </View>
            </View>

            <View className="mt-6 gap-4">
              <Input
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder={category || "Transaction"}
                autoCapitalize="words"
                returnKeyType="done"
              />

              <View>
                <AppText variant="sm" tone="muted" className="mb-2">
                  Category
                </AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {categoryOptions.map((name) => (
                    <CategoryChip key={name} label={name} active={name === category} onPress={() => setCategory(name)} />
                  ))}
                </ScrollView>
              </View>

              <Input
                label="Note"
                value={note}
                onChangeText={setNote}
                placeholder="Add details"
                multiline
                inputClassName="min-h-24 py-3"
                textAlignVertical="top"
              />

              <Card variant="surface" className="p-0 overflow-hidden">
                <SelectRow label="Date" value={format(occurredAt, "MMM d, yyyy")} onPress={() => setShowMode("date")} />
                <View className="h-px bg-stroke" />
                <SelectRow label="Time" value={format(occurredAt, "h:mm a")} onPress={() => setShowMode("time")} />
              </Card>

              {Platform.OS === "ios" ? (
                <View className="gap-3">
                  <Card variant="surface">
                    <DateTimePicker value={occurredAt} mode="date" display="spinner" onChange={onDateChange} />
                  </Card>
                  <Card variant="surface">
                    <DateTimePicker value={occurredAt} mode="time" display="spinner" onChange={onDateChange} />
                  </Card>
                </View>
              ) : null}

              {Platform.OS === "android" && showMode ? (
                <DateTimePicker value={occurredAt} mode={showMode} onChange={onDateChange} />
              ) : null}
            </View>
          </ScrollView>
        )}
      </Sheet>
    </View>
  );
}
