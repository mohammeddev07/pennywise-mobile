import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Button } from "@/shared/ui/components/Button";
import { useBudgetsStore } from "@/features/budgets/store";
import { useBooksStore } from "@/features/books/store";
import { useCategoriesStore } from "@/features/categories/store";
import { Sheet } from "@/shared/ui/components/Sheet";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { Input } from "@/shared/ui/components/Input";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { useSettingsStore } from "@/features/settings/store";
import {
  currencyMinorUnitDigits,
  formatCurrency,
  majorToMinor,
  minorToMajor,
} from "@/shared/utils/formatCurrency";

function localMonthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseBudgetAmount(raw: string, currency: string) {
  const cleaned = raw.trim().replace(/,/g, "");
  const fractionDigits = currencyMinorUnitDigits(currency);
  const pattern =
    fractionDigits === 0
      ? /^\d+$/
      : new RegExp(`^\\d+(?:\\.\\d{0,${fractionDigits}})?$`);
  if (!pattern.test(cleaned)) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount)) return null;
  const amountMinor = majorToMinor(amount, currency);
  return Number.isSafeInteger(amountMinor) ? amountMinor : null;
}

function minorToText(amountMinor: number, currency: string) {
  return minorToMajor(amountMinor, currency).toFixed(currencyMinorUnitDigits(currency));
}

export default function BudgetEditor() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { categoryId, month: monthParam } = useLocalSearchParams<{ categoryId?: string; month?: string }>();
  const catId = (categoryId ?? "").toString().trim();
  const month = (monthParam ?? localMonthKey()).toString();

  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const books = useBooksStore((s) => s.books);
  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);
  const getBudget = useBudgetsStore((s) => s.getBudget);
  const upsertBudget = useBudgetsStore((s) => s.upsertBudget);
  const deleteBudget = useBudgetsStore((s) => s.deleteBudget);
  const loadBudgets = useBudgetsStore((s) => s.loadBudgets);
  const categories = useCategoriesStore((s) => s.categories);
  const showError = useUndoToastStore((s) => s.showError);

  const budgetsPersist = (useBudgetsStore as any).persist;
  const booksPersist = (useBooksStore as any).persist;

  const [budgetsHydrated, setBudgetsHydrated] = useState<boolean>(() => budgetsPersist?.hasHydrated?.() ?? true);
  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => booksPersist?.hasHydrated?.() ?? true);
  const [hydrationError, setHydrationError] = useState(false);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    if (budgetsPersist?.onFinishHydration) {
      const unsub = budgetsPersist.onFinishHydration(() => setBudgetsHydrated(true));
      unsubs.push(unsub);
      if (budgetsPersist?.hasHydrated && !budgetsPersist.hasHydrated()) budgetsPersist?.rehydrate?.();
    }

    if (booksPersist?.onFinishHydration) {
      const unsub = booksPersist.onFinishHydration(() => setBooksHydrated(true));
      unsubs.push(unsub);
      if (booksPersist?.hasHydrated && !booksPersist.hasHydrated()) booksPersist?.rehydrate?.();
    }

    const timeoutId = setTimeout(() => {
      const budgetsReady = budgetsPersist?.hasHydrated ? budgetsPersist.hasHydrated() : true;
      const booksReady = booksPersist?.hasHydrated ? booksPersist.hasHydrated() : true;
      if (!budgetsReady || !booksReady) {
        setHydrationError(true);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      for (const unsub of unsubs) unsub?.();
    };
  }, [booksPersist, budgetsPersist]);

  const retryHydration = () => {
    setHydrationError(false);
    setBudgetsHydrated(budgetsPersist?.hasHydrated?.() ?? true);
    setBooksHydrated(booksPersist?.hasHydrated?.() ?? true);
    budgetsPersist?.rehydrate?.();
    booksPersist?.rehydrate?.();
  };

  const hydrated = budgetsHydrated && booksHydrated;

  useEffect(() => {
    if (hydrated && selectedBookId && month) {
      loadBudgets(selectedBookId, month).catch(() => {});
    }
  }, [hydrated, loadBudgets, month, selectedBookId]);

  const category = useMemo(() => {
    return categories.find((c) => c.id === catId && c.bookId === selectedBookId) ?? null;
  }, [catId, categories, selectedBookId]);
  const currency =
    books.find((book) => book.id === selectedBookId)?.currencyCode ??
    primaryCurrency;

  const existing = useMemo(() => {
    if (!catId) return null;
    return getBudget(selectedBookId, catId, month);
  }, [catId, getBudget, month, selectedBookId]);

  const [value, setValue] = useState(existing ? minorToText(existing.amountMinor, currency) : "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValue(existing ? minorToText(existing.amountMinor, currency) : "");
  }, [currency, existing]);

  const parsedAmountMinor = useMemo(() => parseBudgetAmount(value, currency), [currency, value]);
  const canSave = category?.type === "EXPENSE" && parsedAmountMinor !== null && parsedAmountMinor > 0;

  const onSave = async () => {
    if (!catId || !canSave || parsedAmountMinor === null || isSaving) return;
    setIsSaving(true);
    try {
      await upsertBudget(selectedBookId, catId, month, parsedAmountMinor, existing?.version);
      await queryClient.invalidateQueries({ queryKey: ["summary", selectedBookId, month] });
      router.back();
    } catch (error) {
      showError(error, "Could not save budget.");
    } finally {
      setIsSaving(false);
    }
  };

  const onRemove = async () => {
    if (!catId || !existing || isSaving) return;
    setIsSaving(true);
    try {
      await deleteBudget(selectedBookId, catId, month, existing.version);
      await queryClient.invalidateQueries({ queryKey: ["summary", selectedBookId, month] });
      router.back();
    } catch (error) {
      showError(error, "Could not reset budget.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title={category ? `${category.name} Budget` : "Budget"}
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: tokens.colors.ripple, borderless: true }}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        footer={category?.type === "EXPENSE" ? (
          <View className="gap-3">
            <Button
              label={isSaving ? "Saving..." : "Save Budget"}
              disabled={!canSave || !catId || isSaving}
              onPress={onSave}
              size="md"
            />
            {existing ? (
              <Button
                label="Reset Budget"
                variant="secondary"
                onPress={onRemove}
                disabled={isSaving}
                size="md"
              />
            ) : null}
          </View>
        ) : undefined}
      >
        {hydrationError ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="Couldn’t load budgets"
              message="Retry to continue editing this budget."
              actionLabel="Retry"
              onAction={retryHydration}
              className="px-0"
            />
          </View>
        ) : !hydrated ? (
          <View className="mt-2 gap-3">
            <Skeleton height={80} borderRadius={20} />
            <Skeleton height={56} borderRadius={16} />
            <Skeleton height={56} borderRadius={16} />
          </View>
        ) : !catId || !category ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="No category selected"
              message="Open this editor from a category to set a monthly budget."
              className="px-0"
            />
          </View>
        ) : category.type !== "EXPENSE" ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="Budgets are for expenses"
              message="Income categories cannot have a monthly spending budget."
              actionLabel="Done"
              onAction={() => router.back()}
              className="px-0"
            />
          </View>
        ) : (
          <>
            <Card variant="surface" className="mt-2">
              <View className="flex-row items-center">
                <View className="h-20 w-20 items-center justify-center rounded-full bg-amberSoft">
                  <Ionicons name="pie-chart-outline" size={36} color={tokens.colors.warning} />
                </View>
                <View className="ml-4 flex-1">
                  <AppText variant="2xl">
                    {category.name}
                  </AppText>
                  <AppText variant="base" tone="muted" className="mt-1">
                    This Month
                  </AppText>
                </View>
              </View>
              <View className="mt-6 h-px bg-stroke" />
              <AppText variant="xs" tone="muted" className="uppercase">
                Monthly budget
              </AppText>
              <AppText variant="xl" className="mt-2">
                {existing ? formatCurrency(existing.amountMinor, currency) : "No budget set"}
              </AppText>
            </Card>

            <View className="mt-6">
              <Input
                label="Monthly budget"
                value={value}
                onChangeText={setValue}
                placeholder={currencyMinorUnitDigits(currency) === 0 ? "0" : "0.00"}
                keyboardType={currencyMinorUnitDigits(currency) === 0 ? "number-pad" : "decimal-pad"}
                error={
                  value.length > 0 && parsedAmountMinor === null
                    ? `Enter a valid ${currency} amount.`
                    : undefined
                }
              />

              <AppText variant="xs" tone="muted" className="mt-3">
                This target drives budget progress and over-spend warnings across Home and Categories.
              </AppText>
            </View>
          </>
        )}
      </Sheet>
    </View>
  );
}
