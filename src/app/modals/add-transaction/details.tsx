import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { parseISO } from "date-fns";

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
import { FilterChip } from "@/shared/ui/components/FilterChip";
import { FormField } from "@/shared/ui/components/FormField";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { useScreenPaddingX } from "@/shared/ui/components/Screen";
import { Icon } from "@/shared/ui/components/Icon";
import { DateTimeField } from "@/shared/ui/components/DateTimeField";

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

function parseWhen(iso: string) {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return new Date();
    return d;
  } catch {
    return new Date();
  }
}

/**
 * Step 2 of 2: everything that is not the amount.
 *
 * Title and note are real in-page text fields. They used to be pressable rows
 * that pushed their own routes, which made typing feel like the app was
 * navigating away. Only genuine step changes navigate now: the full category
 * browser and the native date/time picker.
 */
export default function AddTransactionDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const paddingX = useScreenPaddingX();

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
  const setOccurredAt = useAddTransactionDraftStore((s) => s.setOccurredAt);

  const occurredAtDate = useMemo(() => parseWhen(occurredAt), [occurredAt]);
  const onOccurredAtChange = useCallback(
    (next: Date) => setOccurredAt(next.toISOString()),
    [setOccurredAt]
  );

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

  // A wrapping grid rather than a horizontal rail: nothing is hidden off the
  // right edge, so the common categories are all visible at a glance. The
  // selected chip is pulled to the front if it falls outside the first slice,
  // and "View all" reaches every category regardless.
  const visibleOptions = useMemo(() => {
    const head = options.slice(0, 8);
    if (categoryId && !head.some((c) => c.id === categoryId)) {
      const picked = options.find((c) => c.id === categoryId);
      if (picked) return [picked, ...head.slice(0, 7)];
    }
    return head;
  }, [options, categoryId]);

  const canSave =
    amountMinor > 0 && Number.isSafeInteger(amountMinor) && Boolean(categoryId) && Boolean(selectedBook);

  const onSave = async () => {
    // Guarding on `isSaving` is what stops a double submit: the request is
    // idempotent server-side, but a second tap must not start a second one.
    if (isSaving) return;
    if (!canSave) {
      setAttempted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
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
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.colors.app,
        paddingTop: insets.top + tokens.layout.screenPadTop,
      }}
    >
      {/* The mode wash carries over from step 1, so the flow never changes
          its mind about what is being recorded. */}
      <LinearGradient
        pointerEvents="none"
        colors={
          (kind === "EXPENSE" ? tokens.ambient.expense : tokens.ambient.income) as unknown as [string, string]
        }
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 360 }}
      />

      <View style={{ paddingHorizontal: paddingX }}>
        <FlowHeader
          title="New transaction"
          subtitle="Details · 2 of 2"
          onBack={() => router.back()}
          step={2}
          totalSteps={2}
          progressColor={amountColor(kind)}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 24}
      >
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{
            paddingHorizontal: paddingX,
            paddingTop: tokens.space[6],
            paddingBottom: tokens.space[7],
          }}
        >
          {/* Amount recap. Tapping returns to step 1 rather than editing here,
              so there is exactly one place a number can be typed. */}
          <HapticPressable
            onPress={() => router.back()}
            haptic="none"
            pressScale={0.995}
            pressOpacity={1}
            accessibilityRole="button"
            accessibilityLabel="Edit amount"
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: tokens.radii.lg,
              borderWidth: 1,
              borderColor: `${amountColor(kind)}29`,
              backgroundColor: `${amountColor(kind)}14`,
              padding: tokens.space[4],
            }}
          >
            <View style={{ flex: 1, paddingRight: tokens.space[3] }}>
              <AppText variant="xs" style={{ color: amountColor(kind) }}>
                {kind === "EXPENSE" ? "EXPENSE" : "INCOME"}
              </AppText>
              <MoneyAmount
                value={formatCurrency(amountMinor, currency)}
                kind={kind}
                size="2xl"
                style={{ marginTop: tokens.space[1] }}
              />
            </View>
            <Icon name="pencil" size={tokens.icon.row} color={amountColor(kind)} />
          </HapticPressable>

          {/* Title */}
          <FormField
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Light bill, Coffee, Rent…"
            maxLength={TITLE_MAX}
            autoCapitalize="sentences"
            returnKeyType="done"
            containerStyle={{ marginTop: tokens.space[6] }}
          />

          {/* Category */}
          <View style={{ marginTop: tokens.space[6] }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: tokens.space[2],
              }}
            >
              <AppText variant="xs" tone="muted">
                CATEGORY
              </AppText>
              <HapticPressable
                onPress={() => router.push("/modals/add-transaction/category")}
                haptic="none"
                style={{ minHeight: tokens.layout.minTap, justifyContent: "center" }}
              >
                <AppText variant="sm" weight="semibold" style={{ color: tokens.colors.accent }}>
                  View all →
                </AppText>
              </HapticPressable>
            </View>

            {visibleOptions.length === 0 ? (
              <Card variant="surface" padding={16}>
                <AppText variant="sm" tone="muted">
                  No {kind === "EXPENSE" ? "expense" : "income"} categories yet.
                </AppText>
                <Button
                  label="Create a category"
                  variant="secondary"
                  size="md"
                  style={{ marginTop: tokens.space[3] }}
                  onPress={() =>
                    router.push({ pathname: "/modals/category-editor", params: { origin: "add-transaction" } })
                  }
                />
              </Card>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.space[2] }}>
                {visibleOptions.map((c) => (
                  <FilterChip
                    key={c.id}
                    label={c.name}
                    icon={c.icon}
                    iconColor={c.color}
                    active={c.id === categoryId}
                    // Picking a category commits a choice, so it ticks. Filter
                    // chips elsewhere in the app stay silent.
                    role="category"
                    onPress={() => setCategory(c.id, c.name)}
                  />
                ))}
              </View>
            )}

            {attempted && !categoryId ? (
              <AppText variant="sm" tone="danger" style={{ marginTop: tokens.space[2] }}>
                Choose a category before saving.
              </AppText>
            ) : null}
          </View>

          {/* When - two inline fields, each its own bottom sheet. Neither
              leaves this screen: the old combined row pushed a separate
              route, which made a two-second edit feel like navigation. */}
          <View style={{ marginTop: tokens.space[6], flexDirection: "row", gap: tokens.space[3] }}>
            <DateTimeField
              mode="date"
              label="Date"
              value={occurredAtDate}
              onChange={onOccurredAtChange}
              style={{ flex: 1 }}
            />
            <DateTimeField
              mode="time"
              label="Time"
              value={occurredAtDate}
              onChange={onOccurredAtChange}
              style={{ flex: 1 }}
            />
          </View>

          {/* Note */}
          <FormField
            label="Note"
            hint="Optional"
            value={note}
            onChangeText={(next) => setNote(next.slice(0, NOTE_MAX))}
            placeholder="Add a note…"
            multiline
            showCount
            maxLength={NOTE_MAX}
            containerStyle={{ marginTop: tokens.space[6] }}
          />

          {submitError ? (
            <AppText variant="sm" tone="danger" style={{ marginTop: tokens.space[4] }}>
              {submitError}
            </AppText>
          ) : null}
        </ScrollView>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: tokens.colors.divider,
            backgroundColor: tokens.colors.app,
            paddingHorizontal: paddingX,
            paddingTop: tokens.space[4],
            paddingBottom: insets.bottom + tokens.space[4],
          }}
        >
          <Button
            label={isSaving ? "Saving…" : "Save transaction"}
            onPress={onSave}
            loading={isSaving}
            disabled={isSaving}
            size="lg"
            tone={kind === "EXPENSE" ? "expense" : "accent"}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
