import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
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

function toCents(raw: string) {
  const cleaned = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToText(cents: number) {
  const v = (cents / 100).toFixed(2);
  return v;
}

export default function BudgetEditor() {
  const router = useRouter();

  const { categoryId, month: monthParam } = useLocalSearchParams<{ categoryId?: string; month?: string }>();
  const catId = (categoryId ?? "").toString().trim();
  const month = (monthParam ?? new Date().toISOString().slice(0, 7)).toString();

  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const getBudget = useBudgetsStore((s) => s.getBudget);
  const upsertBudget = useBudgetsStore((s) => s.upsertBudget);
  const deleteBudget = useBudgetsStore((s) => s.deleteBudget);
  const loadBudgets = useBudgetsStore((s) => s.loadBudgets);
  const categories = useCategoriesStore((s) => s.categories);

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

  const existing = useMemo(() => {
    if (!catId) return null;
    return getBudget(selectedBookId, catId, month);
  }, [catId, getBudget, month, selectedBookId]);

  const [value, setValue] = useState(existing ? centsToText(existing.amountMinor) : "");

  useEffect(() => {
    setValue(existing ? centsToText(existing.amountMinor) : "");
  }, [existing]);

  const canSave = useMemo(() => toCents(value) > 0, [value]);

  const onSave = () => {
    if (!catId || !canSave) return;
    upsertBudget(selectedBookId, catId, month, toCents(value), existing?.version).then(() => router.back());
  };

  const onRemove = () => {
    if (!catId || !existing) return;
    deleteBudget(selectedBookId, catId, month, existing.version).then(() => router.back());
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
            android_ripple={{ color: "#0B122012", borderless: true }}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        footer={
          <View className="gap-3">
            <Button label="Save Budget" disabled={!canSave || !catId} onPress={onSave} size="md" />
            {existing ? <Button label="Reset Budget" variant="secondary" onPress={onRemove} size="md" /> : null}
          </View>
        }
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
            <Skeleton height={80} borderRadius={24} />
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
                {existing ? centsToText(existing.amountMinor) : "No budget set"}
              </AppText>
            </Card>

            <View className="mt-6">
              <Input
                label="Monthly budget"
                value={value}
                onChangeText={setValue}
                placeholder="0.00"
                keyboardType="decimal-pad"
                inputClassName="text-lg"
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
