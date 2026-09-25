import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform, ScrollView, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { format, parseISO } from "date-fns";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { Sheet } from "@/shared/ui/components/Sheet";
import { IconButton } from "@/shared/ui/components/IconButton";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { AmountInput, applyAmountKey } from "@/shared/ui/components/AmountInput";
import { NumericKeypad, type Key } from "@/shared/ui/NumericKeypad";
import { useScrollToError } from "@/shared/ui/utils/useScrollToError";
import { FormField } from "@/shared/ui/components/FormField";
import { SelectRow } from "@/shared/ui/components/SelectRow";
import { FilterChip } from "@/shared/ui/components/FilterChip";
import { Button } from "@/shared/ui/components/Button";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import {
  isNotFoundError,
  isStaleVersionError,
  type PaymentMethod,
  type Transaction,
  type TransactionKind,
} from "@/features/transactions/model";
import { useTransactionDetail } from "@/features/transactions/queries";
import { updateTransaction } from "@/features/transactions/actions";
import { buildEditPatch } from "@/features/transactions/editPatch";
import { PaymentMethodPicker } from "@/features/transactions/ui/PaymentMethodPicker";
import { getApiErrorMessage } from "@/shared/api/errors";
import { useCategoriesStore } from "@/features/categories/store";
import { TypeToggle } from "@/shared/ui/components/TypeToggle";
import { useBookCurrency } from "@/features/books/useBookCurrency";
import {
  currencyMinorUnitDigits,
  currencySymbol,
  formatCurrency,
  minorToMajor,
  parseAmountToMinor,
} from "@/shared/utils/formatCurrency";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { Icon } from "@/shared/ui/components/Icon";

function minorToAmount(amountMinor: number, currency: string) {
  const amount = minorToMajor(Math.abs(amountMinor), currency);
  const digits = currencyMinorUnitDigits(currency);
  return amount % 1 === 0 ? String(amount.toFixed(0)) : amount.toFixed(digits);
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


export default function EditTransactionModal() {
  const router = useRouter();
  const { id, bookId } = useLocalSearchParams<{ id?: string; bookId?: string }>();

  const categories = useCategoriesStore((s) => s.categories);
  const showError = useUndoToastStore((s) => s.showError);

  // The row comes from the API by id, not from a list; the form is seeded from it once.
  const detail = useTransactionDetail(String(id ?? ""), bookId ? String(bookId) : undefined);
  const tx = detail.data ?? null;
  const currency = useBookCurrency(tx?.bookId);
  const fractionDigits = currencyMinorUnitDigits(currency);

  const [amount, setAmount] = useState("0");
  const [kind, setKind] = useState<TransactionKind>("EXPENSE");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("Uncategorized");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showMode, setShowMode] = useState<"date" | "time" | null>(null);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // The version the user started from. It is the `If-Match` of the save, and is only advanced
  // deliberately (Reload / Keep my changes) - never silently under their edits.
  const [baseVersion, setBaseVersion] = useState<number | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [reloading, setReloading] = useState(false);
  const seededFor = useRef<string | null>(null);
  const { ref: scrollRef, mark, scrollToError } = useScrollToError();

  const seedForm = useCallback(
    (row: Transaction) => {
      setAmount(minorToAmount(row.amountMinor, currency));
      setKind(row.type);
      setTitle(row.title ?? "");
      setCategoryId(row.categoryId);
      setCategoryName(row.categoryName || "Uncategorized");
      setNote(row.note ?? "");
      setPaymentMethod(row.paymentMethod);
      setOccurredAt(parseWhen(row.occurredAt));
      setBaseVersion(row.version);
    },
    [currency]
  );

  // Seed exactly once per transaction. A background refetch must never overwrite typing.
  useEffect(() => {
    if (!tx || seededFor.current === tx.id) return;
    seededFor.current = tx.id;
    seedForm(tx);
  }, [tx, seedForm]);

  const reload = async (mode: "discard" | "keep") => {
    setReloading(true);
    try {
      const fresh = await detail.refetch();
      if (!fresh.data) {
        if (fresh.error && isNotFoundError(fresh.error)) setConflict(false);
        else showError(fresh.error, "Could not reload this transaction.");
        return;
      }
      if (mode === "discard") seedForm(fresh.data);
      else setBaseVersion(fresh.data.version);
      setConflict(false);
      setSaveError("");
    } finally {
      setReloading(false);
    }
  };

  // null = not a valid amount (bad text, too many decimals for this currency, or over the cap).
  const amountMinor = useMemo(() => parseAmountToMinor(amount, currency), [amount, currency]);
  const amountValid = amountMinor !== null && amountMinor > 0;
  const canSave = !!tx && amountValid;

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
    if (!tx || baseVersion === null || amountMinor === null || amountMinor <= 0 || !categoryId || isSaving) {
      // Amount sits at the top; the category row is inside the form block below it.
      if (!amountValid) scrollToError();
      else if (!categoryId) scrollToError("form", "category");
      return;
    }

    const patch = buildEditPatch(tx, { kind, amountMinor, title, categoryId, note, paymentMethod, occurredAt });
    if (Object.keys(patch).length === 0) {
      router.back();
      return;
    }

    setIsSaving(true);
    setSaveError("");
    try {
      const saved = await updateTransaction({ id: tx.id, bookId: tx.bookId, version: baseVersion }, patch, tx.occurredOn);
      if (saved) {
        Keyboard.dismiss();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.back();
      }
    } catch (error) {
      // The form keeps everything the user typed on any failure.
      if (isStaleVersionError(error)) {
        setConflict(true);
        scrollToError();
      } else {
        setSaveError(getApiErrorMessage(error, "Could not update transaction."));
        scrollToError();
        showError(error, "Could not update transaction.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title="Edit transaction"
        leftAction={
          <IconButton icon="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />
        }
        footer={
          tx ? (
            <View>
              <Button
                label={isSaving ? "Saving..." : "Save changes"}
                onPress={onSave}
                loading={isSaving}
                // Not while reloading: saving before the fresh version arrives just hits the same 412 again.
                disabled={!canSave || isSaving || reloading}
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
        {detail.isError && !tx ? (
          <View className="flex-1 justify-center">
            {isNotFoundError(detail.error) ? (
              <EmptyState title="Transaction not found" message="It may have been deleted." className="px-0" />
            ) : (
              <EmptyState
                title="Couldn’t load transaction"
                message="Retry to continue editing."
                actionLabel="Retry"
                tone="danger"
                onAction={() => void detail.refetch()}
                className="px-0"
              />
            )}
          </View>
        ) : !tx ? (
          <View className="mt-2 gap-3">
            <Skeleton height={160} borderRadius={20} />
            <Skeleton height={260} borderRadius={20} />
          </View>
        ) : (
          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            {conflict ? (
              <Card variant="surface" style={{ marginTop: tokens.space[2] }}>
                <AppText variant="base" weight="semibold">
                  This transaction was changed while you were editing
                </AppText>
                <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[1] }}>
                  Another device or session saved a newer version, so your save was not applied. Your edits are still
                  here. “Reload latest” replaces them with the newer version; “Keep my changes” keeps them so you can save over the newer version.
                </AppText>
                <View style={{ flexDirection: "row", gap: tokens.space[3], marginTop: tokens.space[3] }}>
                  <Button label="Reload latest" variant="secondary" size="md" style={{ flex: 1 }} disabled={reloading} onPress={() => void reload("discard")} />
                  <Button label="Keep my changes" size="md" style={{ flex: 1 }} disabled={reloading} onPress={() => void reload("keep")} />
                </View>
              </Card>
            ) : null}
            {saveError ? (
              <AppText variant="sm" tone="danger" style={{ marginTop: tokens.space[3] }}>
                {saveError}
              </AppText>
            ) : null}
            <View className="items-center mt-2">
              <TypeToggle
                value={kind}
                onChange={(next) => {
                  if (next === kind) return;
                  setKind(next);
                  // Categories are type-scoped, so the old pick is no longer valid.
                  setCategoryId("");
                  setCategoryName("Uncategorized");
                }}
              />

              <View className="mt-7 w-full">
                <AmountInput
                  value={amount}
                  kind={kind === "EXPENSE" ? "expense" : "income"}
                  currencySymbol={currencySymbol(currency)}
                  fractionDigits={fractionDigits}
                  helperText={amountMinor === null ? "Invalid amount" : formatCurrency(amountMinor, currency)}
                  helperIsMoney={amountMinor !== null}
                  error={
                    attemptedSave && !amountValid
                      ? `Enter a valid amount greater than zero${fractionDigits > 0 ? ` with at most ${fractionDigits} decimals` : ""}.`
                      : undefined
                  }
                />
              </View>
            </View>

            <View className="mt-6 gap-4" onLayout={mark("form")}>
              <FormField
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder={categoryName || "Transaction"}
                maxLength={120}
                autoCapitalize="words"
                returnKeyType="done"
              />

              <View onLayout={mark("category")}>
                <AppText variant="sm" tone="muted" className="mb-2">
                  Category
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: tokens.space[2] }}
                >
                  {categoryOptions.map((item) => (
                    <FilterChip
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

              <View>
                <AppText variant="sm" tone="muted" className="mb-2">
                  Payment · Optional
                </AppText>
                <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
              </View>

              <FormField
                label="Note"
                value={note}
                onChangeText={setNote}
                placeholder="Add details"
                maxLength={280}
                multiline
                textAlignVertical="top"
              />

              <Card variant="surface" padding={0} style={{ overflow: "hidden" }}>
                <SelectRow label="Transaction date" value={format(occurredAt, "MMM d, yyyy")} onPress={() => setShowMode("date")} />
                <View className="h-px bg-stroke" />
                <SelectRow label="Transaction time" value={format(occurredAt, "h:mm a")} onPress={() => setShowMode("time")} />
              </Card>

              {/* Read-only record metadata: the date above is the transaction date; these
                  are when the record itself was written and last changed. */}
              <View className="gap-1">
                <AppText variant="caption" tone="muted">
                  Record created {format(parseWhen(tx.createdAt), "MMM d, yyyy 'at' h:mm a")} · last updated{" "}
                  {format(parseWhen(tx.updatedAt), "MMM d, yyyy 'at' h:mm a")} (read-only)
                </AppText>
              </View>

              {Platform.OS === "ios" ? (
                <View className="gap-3">
                  <Card variant="surface">
                    <DateTimePicker
                      value={occurredAt}
                      mode="date"
                      display="spinner"
                      themeVariant="dark"
                      textColor={tokens.colors.text}
                      onChange={onDateChange}
                    />
                  </Card>
                  <Card variant="surface">
                    <DateTimePicker
                      value={occurredAt}
                      mode="time"
                      display="spinner"
                      themeVariant="dark"
                      textColor={tokens.colors.text}
                      onChange={onDateChange}
                    />
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
