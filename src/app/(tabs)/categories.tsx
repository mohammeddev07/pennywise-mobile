import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { useCategoriesStore } from "@/features/categories/store";
import { useBooksStore } from "@/features/books/store";
import { useBudgetsStore } from "@/features/budgets/store";
import { useSettingsStore } from "@/features/settings/store";
import { AppText } from "@/shared/ui/components/AppText";
import { Input } from "@/shared/ui/components/Input";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { RingProgress } from "@/shared/ui/components/RingProgress";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { CurrencyCode, TransactionType } from "@/shared/types/models";
import * as summaryApi from "@/shared/api/summary";

function nowMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type CategoryTile = {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  spentCents: number | null;
  budgetCents: number;
  isGhost?: boolean;
};

function Tile({ item, currency }: { item: CategoryTile; currency: CurrencyCode }) {
  const canBudget = item.type === "EXPENSE";
  const spendingKnown = item.spentCents !== null;
  const spentCents = item.spentCents ?? 0;
  const remaining = item.budgetCents - spentCents;
  const hasBudget = item.budgetCents > 0;
  const over = hasBudget && remaining < 0;
  const progress = hasBudget && spendingKnown ? Math.min(1, spentCents / Math.max(1, item.budgetCents)) : 0;

  return (
    <Card variant="card" className="min-h-[178px] overflow-hidden">
      <HapticPressable
        onPress={() =>
          item.isGhost
            ? router.push("/modals/category-editor")
            : router.push({
                pathname: "/modals/category-editor",
                params: { id: item.categoryId },
              })
        }
        haptic="selection"
        pressScale={0.99}
        pressOpacity={0.92}
        className="pb-1"
        android_ripple={{ color: "#0B122012" }}
      >
        <View className="flex-row items-center justify-between">
          <View
            className="h-10 w-10 items-center justify-center rounded-full border border-stroke"
            style={{ backgroundColor: `${item.color}26` }}
          >
            <Ionicons name={item.icon as any} size={18} color={item.color} />
          </View>

          <Ionicons name="create-outline" size={18} color={tokens.colors.muted} />
        </View>

        <AppText variant="base" className="mt-4" weight="semibold" numberOfLines={1}>
          {item.name}
        </AppText>

        {!canBudget ? (
          <AppText variant="sm" tone="muted" className="mt-3">
            Income category
          </AppText>
        ) : (
          <>
            <AppText variant="sm" tone="muted" className="mt-1">
              {spendingKnown ? `${formatCurrency(spentCents, currency, 0)} spent` : "Spending unavailable"}
            </AppText>

            <View className="mt-4 h-1 rounded-full bg-stroke overflow-hidden">
              <View
                className="h-1 rounded-full"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: over ? tokens.colors.danger : tokens.colors.accent,
                }}
              />
            </View>

            {hasBudget && spendingKnown ? (
              <AppText variant="sm" className="mt-3" style={{ color: over ? tokens.colors.danger : tokens.colors.accent }}>
                {over ? `${formatCurrency(Math.abs(remaining), currency, 0)} over` : `${formatCurrency(remaining, currency, 0)} left`}
              </AppText>
            ) : hasBudget ? (
              <AppText variant="sm" tone="muted" className="mt-3">
                {formatCurrency(item.budgetCents, currency, 0)} budget
              </AppText>
            ) : (
              <AppText variant="sm" tone="muted" className="mt-3">
                No budget set
              </AppText>
            )}
          </>
        )}
      </HapticPressable>

      {canBudget ? (
        <HapticPressable
          onPress={() => router.push({ pathname: "/modals/budget-editor", params: { categoryId: item.categoryId } })}
          haptic="selection"
          pressScale={0.98}
          className="mt-2 -ml-3 min-h-11 px-3 rounded-full flex-row items-center self-start"
          android_ripple={{ color: "#0B122012" }}
        >
          <AppText variant="sm" className="text-accent" weight="semibold">
            {hasBudget ? "Edit budget" : "Set budget"}
          </AppText>
        </HapticPressable>
      ) : null}
    </Card>
  );
}

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();

  const categories = useCategoriesStore((s) => s.categories);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const books = useBooksStore((s) => s.books);
  const budgets = useBudgetsStore((s) => s.budgets);
  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);
  const month = useMemo(() => nowMonthKey(), []);

  const catsPersist = (useCategoriesStore as any).persist;
  const booksPersist = (useBooksStore as any).persist;
  const budgetsPersist = (useBudgetsStore as any).persist;

  const [catsHydrated, setCatsHydrated] = useState<boolean>(() => catsPersist?.hasHydrated?.() ?? true);
  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => booksPersist?.hasHydrated?.() ?? true);
  const [budgetsHydrated, setBudgetsHydrated] = useState<boolean>(() => budgetsPersist?.hasHydrated?.() ?? true);
  const [hydrationError, setHydrationError] = useState(false);

  const [query, setQuery] = useState("");

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    if (catsPersist?.onFinishHydration) {
      const unsub = catsPersist.onFinishHydration(() => setCatsHydrated(true));
      unsubs.push(unsub);
      if (catsPersist?.hasHydrated && !catsPersist.hasHydrated()) catsPersist?.rehydrate?.();
    }

    if (booksPersist?.onFinishHydration) {
      const unsub = booksPersist.onFinishHydration(() => setBooksHydrated(true));
      unsubs.push(unsub);
      if (booksPersist?.hasHydrated && !booksPersist.hasHydrated()) booksPersist?.rehydrate?.();
    }

    if (budgetsPersist?.onFinishHydration) {
      const unsub = budgetsPersist.onFinishHydration(() => setBudgetsHydrated(true));
      unsubs.push(unsub);
      if (budgetsPersist?.hasHydrated && !budgetsPersist.hasHydrated()) budgetsPersist?.rehydrate?.();
    }

    const timeoutId = setTimeout(() => {
      const catsReady = catsPersist?.hasHydrated ? catsPersist.hasHydrated() : true;
      const booksReady = booksPersist?.hasHydrated ? booksPersist.hasHydrated() : true;
      const budgetsReady = budgetsPersist?.hasHydrated ? budgetsPersist.hasHydrated() : true;
      if (!catsReady || !booksReady || !budgetsReady) {
        setHydrationError(true);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      for (const unsub of unsubs) unsub?.();
    };
  }, [booksPersist, budgetsPersist, catsPersist]);

  const retryHydration = () => {
    setHydrationError(false);
    setCatsHydrated(catsPersist?.hasHydrated?.() ?? true);
    setBooksHydrated(booksPersist?.hasHydrated?.() ?? true);
    setBudgetsHydrated(budgetsPersist?.hasHydrated?.() ?? true);
    catsPersist?.rehydrate?.();
    booksPersist?.rehydrate?.();
    budgetsPersist?.rehydrate?.();
  };

  const hydrated = catsHydrated && booksHydrated && budgetsHydrated;
  const summaryQuery = useQuery({
    queryKey: ["summary", selectedBookId, month],
    queryFn: () => summaryApi.getMonthlySummary(selectedBookId, month),
    enabled: Boolean(selectedBookId),
  });
  const currency =
    summaryQuery.data?.currencyCode ??
    books.find((book) => book.id === selectedBookId)?.currencyCode ??
    primaryCurrency;

  const tiles = useMemo<CategoryTile[]>(() => {
    const bookId = selectedBookId ?? "personal";

    const budgetByCat = new Map<string, number>();
    for (const b of budgets) {
      if ((b.bookId ?? "personal") !== bookId || b.month !== month) continue;
      const cat = String(b.categoryId ?? "");
      const cents = Number(b.amountMinor ?? 0) || 0;
      if (!cat) continue;
      budgetByCat.set(cat, cents);
    }

    const spentByCat = new Map<string, number>();
    for (const item of summaryQuery.data?.byCategory ?? []) {
      if (item.type !== "EXPENSE") continue;
      spentByCat.set(item.categoryId, item.totalMinor);
    }

    const out: CategoryTile[] = categories
      .filter((category) => category.bookId === bookId)
      .map((c) => ({
      id: c.id,
      categoryId: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      type: c.type,
      spentCents: c.type === "EXPENSE" && summaryQuery.data ? (spentByCat.get(c.id) ?? 0) : null,
      budgetCents: budgetByCat.get(c.id) ?? 0,
      }));

    const addGhost = (categoryId: string, name: string, color = tokens.colors.muted) => {
      if (out.some((x) => x.name === name)) return;
      out.unshift({
        id: `ghost_${categoryId}`,
        categoryId,
        name,
        icon: "pricetag-outline",
        color,
        type: "EXPENSE",
        spentCents: summaryQuery.data ? (spentByCat.get(categoryId) ?? 0) : null,
        budgetCents: budgetByCat.get(categoryId) ?? 0,
        isGhost: true,
      });
    };

    for (const categoryId of new Set([...spentByCat.keys(), ...budgetByCat.keys()])) {
      const budget = budgets.find(
        (b) => b.bookId === bookId && b.month === month && b.categoryId === categoryId,
      );
      addGhost(categoryId, budget?.categoryName ?? "Uncategorized");
    }

    const q = query.trim().toLowerCase();
    const filtered = q ? out.filter((t) => t.name.toLowerCase().includes(q)) : out;

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [budgets, categories, month, query, selectedBookId, summaryQuery.data]);

  const GUTTER = 8;
  const HALF = GUTTER / 2;
  const totalBudgetCents = budgets
    .filter((budget) => budget.bookId === selectedBookId && budget.month === month)
    .reduce((sum, budget) => sum + budget.amountMinor, 0);
  const totalSpentCents = summaryQuery.data?.expenseTotalMinor ?? null;
  const remainingCents = totalSpentCents === null ? null : Math.max(0, totalBudgetCents - totalSpentCents);
  const budgetProgress = totalSpentCents !== null && totalBudgetCents > 0 ? totalSpentCents / totalBudgetCents : 0;

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 12 }}>
      <View className="px-6">
        <View className="flex-row items-center justify-between">
          <AppText variant="2xl">Categories</AppText>

          <HapticPressable
            onPress={() => router.push("/modals/category-editor")}
            haptic="selection"
            pressScale={0.98}
            className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface"
            android_ripple={{ color: "#0B122012", borderless: true }}
          >
            <Ionicons name="add" size={20} color={tokens.colors.accent} />
          </HapticPressable>
        </View>

        <Card className="mt-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <AppText variant="xs" tone="muted" className="uppercase">
                Total monthly budget
              </AppText>
              <AppText variant="2xl" className="mt-3">
                {formatCurrency(totalBudgetCents, currency)}
              </AppText>
              <View className="mt-3 flex-row items-center">
                <Ionicons name="calendar-outline" size={16} color={tokens.colors.accent} />
                <AppText variant="sm" tone="muted" className="ml-2">
                  This month
                </AppText>
              </View>
            </View>
            <View className="items-center">
              <RingProgress progress={budgetProgress} color={tokens.colors.accent} />
              <AppText variant="lg" weight="bold" style={{ marginTop: -58 }}>
                {totalSpentCents === null ? "—" : `${Math.round(Math.min(1, budgetProgress) * 100)}%`}
              </AppText>
              <AppText variant="xs" tone="muted" style={{ marginTop: 36 }}>
                Used
              </AppText>
            </View>
          </View>
          <View className="mt-5 flex-row" style={{ gap: 12 }}>
            <View className="flex-1 rounded-lg border border-stroke bg-surfaceAlt p-3">
              <AppText variant="xs" tone="muted">Spent</AppText>
              <AppText variant="base" className="mt-1" weight="bold">
                {totalSpentCents === null ? "Unavailable" : formatCurrency(totalSpentCents, currency)}
              </AppText>
            </View>
            <View className="flex-1 rounded-lg border border-stroke bg-surfaceAlt p-3">
              <AppText variant="xs" tone="muted">Remaining</AppText>
              <AppText variant="base" className="mt-1" weight="bold" style={{ color: tokens.colors.accent }}>
                {remainingCents === null ? "Unavailable" : formatCurrency(remainingCents, currency)}
              </AppText>
            </View>
          </View>
          {summaryQuery.isError ? (
            <HapticPressable
              onPress={() => {
                void summaryQuery.refetch();
              }}
              haptic="selection"
              className="mt-4 min-h-11 items-center justify-center rounded-full border border-stroke"
            >
              <AppText variant="sm" tone="muted">
                Retry monthly totals
              </AppText>
            </HapticPressable>
          ) : null}
        </Card>

        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search categories..."
          autoCorrect={false}
          autoCapitalize="none"
          variant="search"
          leftIcon={<Ionicons name="search" size={22} color={tokens.colors.muted} />}
          containerClassName="mt-5"
        />
      </View>

      <View className="flex-1 px-6 mt-4">
        {hydrationError ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="Couldn’t load categories"
              message="Retry to refresh category and budget data."
              actionLabel="Retry"
              onAction={retryHydration}
              className="px-0"
            />
          </View>
        ) : !hydrated ? (
          <View className="pt-2">
            <View className="flex-row" style={{ gap: GUTTER }}>
              <View style={{ flex: 1 }}>
                <Skeleton height={220} borderRadius={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Skeleton height={220} borderRadius={24} />
              </View>
            </View>
            <View className="mt-2 flex-row" style={{ gap: GUTTER }}>
              <View style={{ flex: 1 }}>
                <Skeleton height={220} borderRadius={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Skeleton height={220} borderRadius={24} />
              </View>
            </View>
          </View>
        ) : tiles.length === 0 ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title={query.trim().length ? "No categories found" : "No categories yet"}
              message={
                query.trim().length
                  ? "Try a different search term."
                  : "Create your first category to start organizing spending."
              }
              actionLabel="Create category"
              onAction={() => router.push("/modals/category-editor")}
              className="px-0"
            />
          </View>
        ) : (
          <FlashList
            data={tiles}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={({ item, index }) => {
              const isLeft = index % 2 === 0;

              return (
                <View
                  style={{
                    flex: 1,
                    paddingLeft: isLeft ? 0 : HALF,
                    paddingRight: isLeft ? HALF : 0,
                    paddingBottom: GUTTER,
                    paddingTop: 8,
                  }}
                >
                    <Tile item={item} currency={currency as CurrencyCode} />
                </View>
              );
            }}
            contentContainerStyle={{
              paddingBottom: (insets.bottom || 0) + 24,
              paddingTop: 4,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}
