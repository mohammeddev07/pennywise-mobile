import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format, parseISO } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { amountColor } from "@/shared/ui/theme/money";
import { useBooksStore } from "@/features/books/store";
import { useBookCurrency } from "@/features/books/useBookCurrency";
import { useCategoriesStore } from "@/features/categories/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { useTransactionsStore } from "@/features/transactions/store";
import * as transactionsApi from "@/shared/api/transactions";
import { getApiErrorMessage } from "@/shared/api/errors";
import { getAccountEpoch, isCurrentAccountEpoch } from "@/shared/session/accountEpoch";
import { formatCurrency, majorToMinor } from "@/shared/utils/formatCurrency";
import type { PaymentMethod } from "@/shared/types/models";

import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { Card } from "@/shared/ui/components/Card";
import { FlowHeader } from "@/shared/ui/components/FlowHeader";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { CategoryIcon } from "@/shared/ui/components/CategoryIcon";

const TITLE_MAX = 120;
const NOTE_MAX = 280;

function parseAmountToMinor(raw: string, currency: string) {
  const cleaned = String(raw || "0")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return majorToMinor(n, currency);
}

function whenLabel(iso: string) {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return "Now";
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "Now";
  }
}

/** Label above an inline field. Kept local: it is pure layout, not a new pattern. */
function FieldLabel({ children }: { children: string }) {
  return (
    <AppText variant="xs" tone="muted" className="mb-2 uppercase">
      {children}
    </AppText>
  );
}

/**
 * Step 2 of 2: everything that is not the amount.
 *
 * Title and note are real in-page TextInputs. They used to be pressable rows
 * that pushed their own routes, which made typing feel like the app was
 * navigating away. Only genuine step changes navigate now: the full category
 * browser and the native date/time picker.
 */
export default function AddTransactionDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);

  const categories = useCategoriesStore((s) => s.categories);
  const loadCategories = useCategoriesStore((s) => s.loadCategories);
  const consumeLastCreatedCategoryId = useCategoriesStore((s) => s.consumeLastCreatedCategoryId);

  const amount = useAddTransactionDraftStore((s) => s.amount);
  const kind = useAddTransactionDraftStore((s) => s.kind);
  const title = useAddTransactionDraftStore((s) => s.title);
  const note = useAddTransactionDraftStore((s) => s.note);
  const categoryId = useAddTransactionDraftStore((s) => s.categoryId);
  const categoryName = useAddTransactionDraftStore((s) => s.categoryName);
  const occurredAt = useAddTransactionDraftStore((s) => s.occurredAt);
  const idempotencyKey = useAddTransactionDraftStore((s) => s.idempotencyKey);
  const draftBookId = useAddTransactionDraftStore((s) => s.bookId);

  const setTitle = useAddTransactionDraftStore((s) => s.setTitle);
  const setNote = useAddTransactionDraftStore((s) => s.setNote);
  const setCategory = useAddTransactionDraftStore((s) => s.setCategory);

  const [attempted, setAttempted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const bookId = draftBookId || selectedBookId;
  const selectedBook = books.find((b) => b.id === bookId) ?? null;
  const currency = useBookCurrency(bookId);
  const amountMinor = useMemo(() => parseAmountToMinor(amount, currency), [amount, currency]);

  // Re-fetch on entry so a category added on another device (or created while
  // the local cache was stale) is selectable without leaving the flow.
  useEffect(() => {
    if (!bookId) return;
    loadCategories(bookId).catch(() => {});
  }, [bookId, loadCategories]);

  // Pick up a category created from the full browser and select it here.
  useFocusEffect(
    useCallback(() => {
      const createdId = consumeLastCreatedCategoryId();
      if (!createdId) return;
      const created = categories.find((c) => c.id === createdId);
      if (created) setCategory(created.id, created.name);
    }, [categories, consumeLastCreatedCategoryId, setCategory])
  );

  const options = useMemo(
    () => categories.filter((c) => c.bookId === bookId && c.type === kind && !c.isDisabled),
    [categories, bookId, kind]
  );

  // Keep the selected chip visible even if it falls outside the first slice.
  const visibleOptions = useMemo(() => {
    const head = options.slice(0, 12);
    if (categoryId && !head.some((c) => c.id === categoryId)) {
      const picked = options.find((c) => c.id === categoryId);
      if (picked) return [picked, ...head];
    }
    return head;
  }, [options, categoryId]);

  const canSave = amountMinor > 0 && Number.isSafeInteger(amountMinor) && Boolean(categoryId) && Boolean(selectedBook);

  const onSave = async () => {
    if (isSaving) return;
    if (!canSave) {
      setAttempted(true);
      return;
    }

    const accountEpoch = getAccountEpoch();
    setIsSaving(true);
    setSubmitError("");
    try {
      const tx = await transactionsApi.createTransaction(bookId, idempotencyKey, {
        type: kind,
        amountMinor,
        categoryId: categoryId as string,
        title: title.trim() || undefined,
        note: note.trim() || undefined,
        paymentMethod: "CASH" as PaymentMethod,
        occurredAt,
      });
      if (!isCurrentAccountEpoch(accountEpoch)) return;

      useTransactionsStore.getState().addTransaction(tx);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["balance", bookId] }),
        queryClient.invalidateQueries({ queryKey: ["summary", bookId] }),
      ]);

      router.replace({
        pathname: "/modals/add-transaction/success",
        params: {
          amount,
          kind,
          title: title.trim(),
          categoryId,
          categoryName,
          note: note.trim(),
          bookId,
          occurredAt,
          currency,
          paymentMethod: "CASH",
        },
      });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Could not save transaction."));
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + tokens.space[3] }}>
      <View className="px-6">
        <FlowHeader title="Details" onBack={() => router.back()} step={2} totalSteps={2} />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 24}
      >
        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingTop: tokens.space[6], paddingBottom: tokens.space[8] }}
        >
          {/* Amount recap. Tapping returns to step 1 rather than editing here,
              so there is exactly one place a number can be typed. */}
          <HapticPressable onPress={() => router.back()} haptic="selection" pressScale={0.99}>
            <Card variant="surface" className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <AppText variant="xs" tone="muted" className="uppercase">
                  {kind === "EXPENSE" ? "Expense" : "Income"}
                </AppText>
                <AppText
                  variant="2xl"
                  className="mt-1"
                  numberOfLines={1}
                  style={{ color: amountColor(kind) }}
                >
                  {formatCurrency(amountMinor, currency)}
                </AppText>
              </View>
              <View className="h-10 w-10 items-center justify-center rounded-full border border-stroke bg-surfaceAlt">
                <Ionicons name="pencil" size={16} color={tokens.colors.muted} />
              </View>
            </Card>
          </HapticPressable>

          {/* Title - a plain in-page text field. */}
          <View className="mt-6">
            <FieldLabel>Title</FieldLabel>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Coffee, Uber, Rent…"
              placeholderTextColor={tokens.colors.muted}
              maxLength={TITLE_MAX}
              autoCapitalize="sentences"
              returnKeyType="done"
              className="h-14 w-full rounded-lg border border-stroke bg-surface px-4"
              style={[tokens.typography.base, { color: tokens.colors.text }]}
            />
          </View>

          {/* Category - inline chips, with the full browser one tap away. */}
          <View className="mt-6">
            <View className="mb-2 flex-row items-center justify-between">
              <FieldLabel>Category</FieldLabel>
              <HapticPressable
                onPress={() => router.push("/modals/add-transaction/category")}
                haptic="selection"
                className="pb-2"
              >
                <AppText variant="sm" weight="semibold" style={{ color: tokens.semantic.primary }}>
                  See all
                </AppText>
              </HapticPressable>
            </View>

            {visibleOptions.length === 0 ? (
              <Card variant="surface">
                <AppText variant="sm" tone="muted">
                  No {kind === "EXPENSE" ? "expense" : "income"} categories yet.
                </AppText>
                <Button
                  label="Create a category"
                  variant="outline"
                  size="md"
                  className="mt-3"
                  onPress={() =>
                    router.push({ pathname: "/modals/category-editor", params: { origin: "add-transaction" } })
                  }
                />
              </Card>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View className="flex-row" style={{ gap: tokens.space[2] }}>
                  {visibleOptions.map((c) => {
                    const active = c.id === categoryId;
                    return (
                      <HapticPressable
                        key={c.id}
                        onPress={() => setCategory(c.id, c.name)}
                        haptic="selection"
                        pressScale={0.98}
                        className="h-12 flex-row items-center rounded-full border px-4"
                        style={{
                          borderColor: active ? tokens.semantic.primary : tokens.colors.stroke,
                          backgroundColor: active ? tokens.colors.greenSoft : tokens.colors.surface,
                        }}
                        android_ripple={{ color: "#0B122012", borderless: true }}
                      >
                        <Ionicons name={c.icon as any} size={16} color={c.color} />
                        <AppText
                          variant="sm"
                          weight="semibold"
                          className="ml-2"
                          style={{ color: active ? tokens.semantic.primary : tokens.colors.text }}
                        >
                          {c.name}
                        </AppText>
                      </HapticPressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {attempted && !categoryId ? (
              <AppText variant="sm" tone="danger" className="mt-2">
                Choose a category before saving.
              </AppText>
            ) : null}
          </View>

          {/* When - a native picker, so this one legitimately is its own step. */}
          <View className="mt-6">
            <FieldLabel>When</FieldLabel>
            <HapticPressable
              onPress={() => router.push("/modals/add-transaction/datetime")}
              haptic="selection"
              pressScale={0.99}
              className="h-14 w-full flex-row items-center rounded-lg border border-stroke bg-surface px-4"
              android_ripple={{ color: "#0B122012" }}
            >
              <CategoryIcon icon="calendar-outline" color={tokens.semantic.info} size={32} />
              <AppText variant="base" className="ml-3 flex-1" numberOfLines={1}>
                {whenLabel(occurredAt)}
              </AppText>
              <Ionicons name="chevron-forward" size={18} color={tokens.colors.muted} />
            </HapticPressable>
          </View>

          {/* Note - a plain in-page text field. */}
          <View className="mt-6">
            <FieldLabel>Note</FieldLabel>
            <View className="rounded-lg border border-stroke bg-surface px-4 pb-3 pt-4">
              <TextInput
                value={note}
                onChangeText={(next) => setNote(next.slice(0, NOTE_MAX))}
                placeholder="Add context for this transaction"
                placeholderTextColor={tokens.colors.muted}
                multiline
                textAlignVertical="top"
                maxLength={NOTE_MAX}
                style={[tokens.typography.base, { color: tokens.colors.text, minHeight: 96 }]}
              />
              <AppText variant="xs" tone="muted" className="mt-2 self-end">
                {note.length}/{NOTE_MAX}
              </AppText>
            </View>
          </View>

          {submitError ? (
            <AppText variant="sm" tone="danger" className="mt-4">
              {submitError}
            </AppText>
          ) : null}
        </ScrollView>

        <View
          className="border-t border-stroke bg-app px-6 pt-4"
          style={{ paddingBottom: insets.bottom + tokens.space[4] }}
        >
          <Button
            label={isSaving ? "Saving…" : "Save transaction"}
            onPress={onSave}
            loading={isSaving}
            disabled={isSaving}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
