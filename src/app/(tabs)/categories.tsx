import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { useCategoriesStore } from "@/features/categories/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useBooksStore } from "@/features/books/store";
import { useBudgetsStore } from "@/features/budgets/store";
import { useSettingsStore } from "@/features/settings/store";
import { AppText } from "@/shared/ui/components/AppText";
import { Input } from "@/shared/ui/components/Input";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { CurrencyCode } from "@/shared/types/models";

function monthKey(iso?: string) {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

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
  spentCents: number;
  budgetCents: number;
  isGhost?: boolean;
};

function Tile({ item, currency }: { item: CategoryTile; currency: CurrencyCode }) {
  const remaining = item.budgetCents - item.spentCents;
  const hasBudget = item.budgetCents > 0;
  const over = hasBudget && remaining < 0;
  const progress = hasBudget ? Math.min(1, item.spentCents / Math.max(1, item.budgetCents)) : 0;

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
        android_ripple={{ color: "#FFFFFF10" }}
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

        <AppText variant="base" className="mt-4" style={{ fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
          {item.name}
        </AppText>

        <AppText variant="sm" tone="muted" className="mt-1">
          {formatCurrency(item.spentCents, currency, 0)} spent
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

        {hasBudget ? (
          <AppText variant="sm" className="mt-3" style={{ color: over ? tokens.colors.danger : tokens.colors.accent }}>
            {over ? `${formatCurrency(Math.abs(remaining), currency, 0)} over` : `${formatCurrency(remaining, currency, 0)} left`}
          </AppText>
        ) : (
          <AppText variant="sm" tone="muted" className="mt-3">
            No budget set
          </AppText>
        )}
      </HapticPressable>

      <HapticPressable
        onPress={() => router.push({ pathname: "/modals/budget-editor", params: { category: item.name } })}
        haptic="selection"
        pressScale={0.98}
        className="mt-2 -ml-3 min-h-11 px-3 rounded-full flex-row items-center self-start"
        android_ripple={{ color: "#FFFFFF10" }}
      >
        <AppText variant="sm" className="text-accent" style={{ fontFamily: "Inter_600SemiBold" }}>
          {hasBudget ? "Edit budget" : "Set budget"}
        </AppText>
      </HapticPressable>
    </Card>
  );
}

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();

  const categories = useCategoriesStore((s) => s.categories);
  const transactions = useTransactionsStore((s) => s.transactions);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const budgets = useBudgetsStore((s) => s.budgets);
  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);

  const catsPersist = (useCategoriesStore as any).persist;
  const txPersist = (useTransactionsStore as any).persist;
  const booksPersist = (useBooksStore as any).persist;
  const budgetsPersist = (useBudgetsStore as any).persist;

  const [catsHydrated, setCatsHydrated] = useState<boolean>(() => catsPersist?.hasHydrated?.() ?? true);
  const [txHydrated, setTxHydrated] = useState<boolean>(() => txPersist?.hasHydrated?.() ?? true);
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

    if (txPersist?.onFinishHydration) {
      const unsub = txPersist.onFinishHydration(() => setTxHydrated(true));
      unsubs.push(unsub);
      if (txPersist?.hasHydrated && !txPersist.hasHydrated()) txPersist?.rehydrate?.();
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
      const txReady = txPersist?.hasHydrated ? txPersist.hasHydrated() : true;
      const booksReady = booksPersist?.hasHydrated ? booksPersist.hasHydrated() : true;
      const budgetsReady = budgetsPersist?.hasHydrated ? budgetsPersist.hasHydrated() : true;
      if (!catsReady || !txReady || !booksReady || !budgetsReady) {
        setHydrationError(true);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      for (const unsub of unsubs) unsub?.();
    };
  }, [booksPersist, budgetsPersist, catsPersist, txPersist]);

  const retryHydration = () => {
    setHydrationError(false);
    setCatsHydrated(catsPersist?.hasHydrated?.() ?? true);
    setTxHydrated(txPersist?.hasHydrated?.() ?? true);
    setBooksHydrated(booksPersist?.hasHydrated?.() ?? true);
    setBudgetsHydrated(budgetsPersist?.hasHydrated?.() ?? true);
    catsPersist?.rehydrate?.();
    txPersist?.rehydrate?.();
    booksPersist?.rehydrate?.();
    budgetsPersist?.rehydrate?.();
  };

  const hydrated = catsHydrated && txHydrated && booksHydrated && budgetsHydrated;

  const tiles = useMemo<CategoryTile[]>(() => {
    const bookId = selectedBookId ?? "personal";
    const month = nowMonthKey();

    const budgetByCat = new Map<string, number>();
    for (const b of budgets) {
      if ((b.bookId ?? "personal") !== bookId) continue;
      const cat = String(b.category ?? "");
      const cents = Number(b.budgetCents ?? 0) || 0;
      if (!cat) continue;
      budgetByCat.set(cat, cents);
    }

    const spentByCat = new Map<string, number>();
    for (const tx of transactions as any[]) {
      if (tx.bookId && tx.bookId !== bookId) continue;
      if (tx.kind !== "expense") continue;
      if (monthKey(tx.occurredAt) !== month) continue;

      const cat = String(tx.category ?? "Uncategorized");
      const cents = Math.abs(Number(tx.amountCents ?? 0) || 0);
      spentByCat.set(cat, (spentByCat.get(cat) ?? 0) + cents);
    }

    const out: CategoryTile[] = categories.map((c) => ({
      id: c.id,
      categoryId: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      spentCents: spentByCat.get(c.name) ?? 0,
      budgetCents: budgetByCat.get(c.name) ?? 0,
    }));

    const addGhost = (name: string, color = tokens.colors.muted) => {
      if (out.some((x) => x.name === name)) return;
      out.unshift({
        id: `ghost_${name}`,
        categoryId: `ghost_${name}`,
        name,
        icon: "pricetag-outline",
        color,
        spentCents: spentByCat.get(name) ?? 0,
        budgetCents: budgetByCat.get(name) ?? 0,
        isGhost: true,
      });
    };

    for (const name of new Set([...spentByCat.keys(), ...budgetByCat.keys()])) addGhost(name);

    const q = query.trim().toLowerCase();
    const filtered = q ? out.filter((t) => t.name.toLowerCase().includes(q)) : out;

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [budgets, categories, query, selectedBookId, transactions]);

  const GUTTER = 8;
  const HALF = GUTTER / 2;

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
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="add" size={20} color={tokens.colors.accent} />
          </HapticPressable>
        </View>

        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search categories..."
          autoCorrect={false}
          autoCapitalize="none"
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
                    <Tile item={item} currency={primaryCurrency} />
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
