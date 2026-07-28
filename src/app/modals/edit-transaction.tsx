import { useEffect, useMemo, useState } from "react";
import { Keyboard, Platform, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
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
import { useBooksStore } from "@/features/books/store";
import { useSettingsStore } from "@/features/settings/store";
import {
  currencyMinorUnitDigits,
  currencySymbol,
  formatCurrency,
  majorToMinor,
  minorToMajor,
} from "@/shared/utils/formatCurrency";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";

function minorToAmount(amountMinor: number, currency: string) {
  const amount = minorToMajor(Math.abs(amountMinor), currency);
  const digits = currencyMinorUnitDigits(currency);
  return amount % 1 === 0 ? String(amount.toFixed(0)) : amount.toFixed(digits);
}

function parseAmountToMinor(raw: string, currency: string) {
  const cleaned = String(raw || "0")
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return majorToMinor(n, currency);
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
      android_ripple={{ color: "#0B122012", borderless: true }}
    >
      <AppText variant="sm" style={{ color: active ? tokens.colors.accent : tokens.colors.text }}>
        {label}
      </AppText>
    </HapticPressable>
  );
}

export default function EditTransactionModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const transactions = useTransactionsStore((s) => s.transactions);
  const updateTransaction = useTransactionsStore((s) => s.updateTransaction);
  const categories = useCategoriesStore((s) => s.categories);
  const books = useBooksStore((s) => s.books);
  const fallbackCurrency = useSettingsStore((s) => s.primaryCurrency);
  const showError = useUndoToastStore((s) => s.showError);

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
  const currency = useMemo(
    () => books.find((book) => book.id === tx?.bookId)?.currencyCode ?? fallbackCurrency,
    [books, fallbackCurrency, tx?.bookId],
  );
  const fractionDigits = currencyMinorUnitDigits(currency);

  const [amount, setAmount] = useState("0");
  const [kind, setKind] = useState<TransactionKind>("EXPENSE");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("Uncategorized");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showMode, setShowMode] = useState<"date" | "time" | null>(null);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!tx) return;
    setAmount(minorToAmount(tx.amountMinor, currency));
    setKind(tx.type);
    setTitle(tx.title === tx.categoryName ? "" : tx.title);
    setCategoryId(tx.categoryId);
    setCategoryName(tx.categoryName || "Uncategorized");
    setNote(tx.note ?? "");
    setOccurredAt(parseWhen(tx.occurredAt));
  }, [currency, tx]);

  const amountCents = useMemo(() => parseAmountToMinor(amount, currency), [amount, currency]);
  const canSave = !!tx && Number.isSafeInteger(amountCents) && amountCents > 0;

  const categoryOptions = useMemo(() => {
    if (!tx) return [];
    const options = categories
      .filter((c) => c.bookId === tx.bookId && c.type === kind && !c.isDisabled)
      .map((c) => ({ id: c.id, name: c.name }));
    if (categoryId && tx.type === kind && !options.some((c) => c.id === categoryId)) {
      options.unshift({ id: categoryId, name: categoryName });
    }
    return options;
  }, [categories, categoryId, categoryName, kind, tx]);

  const onKey = (k: Key) => setAmount((prev) => applyAmountKey(prev, k, fractionDigits));

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowMode(null);
    if (!selected) return;
    setOccurredAt(selected);
  };

  const onSave = async () => {
    setAttemptedSave(true);
    if (!tx || !Number.isSafeInteger(amountCents) || amountCents <= 0 || !categoryId || isSaving) return;

    setIsSaving(true);
    try {
      const ok = await updateTransaction(tx.id, {
        type: kind,
        amountMinor: amountCents,
        title: title.trim(),
        categoryId,
        note: note.trim(),
        occurredAt: occurredAt.toISOString(),
      });

      if (ok) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["balance", tx.bookId] }),
          queryClient.invalidateQueries({ queryKey: ["summary", tx.bookId] }),
        ]);
        Keyboard.dismiss();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.back();
      }
    } catch (error) {
      showError(error, "Could not update transaction.");
    } finally {
      setIsSaving(false);
    }
  };

  const retryHydration = () => {
    setHydrationError(false);
    setHydrated(txPersist?.hasHydrated?.() ?? true);
    txPersist?.rehydrate?.();
  };

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title="Edit transaction"
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#0B122012", borderless: true }}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        footer={
          tx ? (
            <View>
              <Button
                label={isSaving ? "Saving..." : "Save changes"}
                onPress={onSave}
                disabled={!canSave || isSaving}
                size="md"
              />
              <View className="mt-2">
                <NumericKeypad
                  onPress={(key) => onKey(key as Key)}
                  onDelete={() => onKey("back")}
                  decimalAllowed={fractionDigits > 0}
                />
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
                  onPress={() => {
                    if (kind !== "EXPENSE") {
                      setKind("EXPENSE");
                      setCategoryId("");
                      setCategoryName("Uncategorized");
                    }
                  }}
                  haptic="selection"
                  pressScale={0.99}
                  className={`px-6 h-12 items-center justify-center ${kind === "EXPENSE" ? "bg-card" : ""}`}
                >
                  <AppText variant="sm" className={kind === "EXPENSE" ? "text-text" : "text-muted"}>
                    Expense
                  </AppText>
                </HapticPressable>
                <HapticPressable
                  onPress={() => {
                    if (kind !== "INCOME") {
                      setKind("INCOME");
                      setCategoryId("");
                      setCategoryName("Uncategorized");
                    }
                  }}
                  haptic="selection"
                  pressScale={0.99}
                  className={`px-6 h-12 items-center justify-center ${kind === "INCOME" ? "bg-card" : ""}`}
                >
                  <AppText variant="sm" className={kind === "INCOME" ? "text-text" : "text-muted"}>
                    Income
                  </AppText>
                </HapticPressable>
              </View>

              <View className="mt-7 w-full">
                <AmountInput
                  value={amount}
                  kind={kind === "EXPENSE" ? "expense" : "income"}
                  currencySymbol={currencySymbol(currency)}
                  fractionDigits={fractionDigits}
                  helperText={formatCurrency(amountCents, currency)}
                  error={
                    attemptedSave && (!Number.isSafeInteger(amountCents) || amountCents <= 0)
                      ? "Enter a valid amount greater than zero."
                      : undefined
                  }
                />
              </View>
            </View>

            <View className="mt-6 gap-4">
              <Input
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder={categoryName || "Transaction"}
                maxLength={120}
                autoCapitalize="words"
                returnKeyType="done"
              />

              <View>
                <AppText variant="sm" tone="muted" className="mb-2">
                  Category
                </AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {categoryOptions.map((item) => (
                    <CategoryChip
                      key={item.id}
                      label={item.name}
                      active={item.id === categoryId}
                      onPress={() => {
                        setCategoryId(item.id);
                        setCategoryName(item.name);
                      }}
                    />
                  ))}
                </ScrollView>
                {attemptedSave && !categoryId ? (
                  <AppText variant="sm" tone="danger" className="mt-2">
                    Choose a category that matches the transaction type.
                  </AppText>
                ) : null}
              </View>

              <Input
                label="Note"
                value={note}
                onChangeText={setNote}
                placeholder="Add details"
                maxLength={280}
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
