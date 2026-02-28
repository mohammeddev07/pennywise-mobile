import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/shared/ui/theme/tokens";
import { BookPill } from "@/shared/ui/components/BookPill";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { StreamingText } from "@/shared/ui/components/StreamingText";
import { CharacterWidget, type CharacterState } from "@/shared/ui/components/CharacterWidget";
import { Card } from "@/shared/ui/components/Card";
import { AppText } from "@/shared/ui/components/AppText";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { TransactionRow } from "@/shared/ui/components/TransactionRow";

import { useBooksStore } from "@/features/books/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useBudgetsStore } from "@/features/budgets/store";

function formatMoney2(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(2);
  const [i, d] = dollars.split(".");
  const intWithSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${intWithSep}.${d}`;
}

type BudgetItem = {
  category: string;
  spentCents: number;
  budgetCents: number;
};

function BudgetTile({ item }: { item: BudgetItem }) {
  const remaining = item.budgetCents - item.spentCents;
  const over = remaining < 0;
  const progress = Math.min(1, item.spentCents / Math.max(1, item.budgetCents));

  return (
    <Card variant="surface" className="w-48">
      <AppText variant="base" style={{ fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
        {item.category}
      </AppText>

      <AppText variant="sm" tone="muted" className="mt-1">
        {formatMoney2(item.spentCents)} of {formatMoney2(item.budgetCents)}
      </AppText>

      <View className="mt-4 h-2 overflow-hidden rounded-full bg-stroke">
        <View
          className="h-2 rounded-full"
          style={{
            width: `${Math.max(4, Math.round(progress * 100))}%`,
            backgroundColor: over ? tokens.colors.danger : tokens.colors.accent,
          }}
        />
      </View>

      <AppText variant="sm" className="mt-3" style={{ color: over ? tokens.colors.danger : tokens.colors.accent }}>
        {over ? `${formatMoney2(Math.abs(remaining))} over` : `${formatMoney2(remaining)} left`}
      </AppText>
    </Card>
  );
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const books = useBooksStore((s) => s.books);

  const transactions = useTransactionsStore((s) => s.transactions);
  const budgets = useBudgetsStore((s) => s.budgets);

  const booksPersist = (useBooksStore as any).persist;
  const txPersist = (useTransactionsStore as any).persist;
  const budgetsPersist = (useBudgetsStore as any).persist;

  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => {
    const has = booksPersist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });
  const [txHydrated, setTxHydrated] = useState<boolean>(() => {
    const has = txPersist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });
  const [budgetsHydrated, setBudgetsHydrated] = useState<boolean>(() => {
    const has = budgetsPersist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });
  const [hydrationError, setHydrationError] = useState(false);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    if (booksPersist?.onFinishHydration) {
      const unsub = booksPersist.onFinishHydration(() => setBooksHydrated(true));
      unsubs.push(unsub);
      if (booksPersist?.hasHydrated && !booksPersist.hasHydrated()) booksPersist?.rehydrate?.();
    }

    if (txPersist?.onFinishHydration) {
      const unsub = txPersist.onFinishHydration(() => setTxHydrated(true));
      unsubs.push(unsub);
      if (txPersist?.hasHydrated && !txPersist.hasHydrated()) txPersist?.rehydrate?.();
    }

    if (budgetsPersist?.onFinishHydration) {
      const unsub = budgetsPersist.onFinishHydration(() => setBudgetsHydrated(true));
      unsubs.push(unsub);
      if (budgetsPersist?.hasHydrated && !budgetsPersist.hasHydrated()) budgetsPersist?.rehydrate?.();
    }

    const timeoutId = setTimeout(() => {
      const booksReady = booksPersist?.hasHydrated ? booksPersist.hasHydrated() : true;
      const txReady = txPersist?.hasHydrated ? txPersist.hasHydrated() : true;
      const budgetsReady = budgetsPersist?.hasHydrated ? budgetsPersist.hasHydrated() : true;
      if (!booksReady || !txReady || !budgetsReady) {
        setHydrationError(true);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      for (const unsub of unsubs) unsub?.();
    };
  }, [booksPersist, budgetsPersist, txPersist]);

  const isHydrated = booksHydrated && txHydrated && budgetsHydrated;

  const selectedBookName = useMemo(
    () => books.find((b) => b.id === selectedBookId)?.name ?? "Personal",
    [books, selectedBookId]
  );

  const bookTransactions = useMemo(() => transactions.filter((t) => t.bookId === selectedBookId), [transactions, selectedBookId]);

  const balance = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const tx of bookTransactions) {
      if (tx.kind === "income") income += tx.amountCents;
      else expense += tx.amountCents;
    }

    return { incomeCents: income, expenseCents: expense, netCents: income - expense };
  }, [bookTransactions]);

  const budgetItems = useMemo(() => {
    const bookBudgets = budgets.filter((b) => b.bookId === selectedBookId);

    const spentByCategory = new Map<string, number>();
    for (const tx of bookTransactions) {
      if (tx.kind !== "expense") continue;
      const key = (tx.category || "Uncategorized").trim() || "Uncategorized";
      spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + tx.amountCents);
    }

    return bookBudgets
      .map((b) => ({
        category: b.category,
        budgetCents: b.budgetCents,
        spentCents: spentByCategory.get(b.category) ?? 0,
      }))
      .sort((a, b) => (b.spentCents / Math.max(1, b.budgetCents)) - a.spentCents / Math.max(1, a.budgetCents));
  }, [bookTransactions, budgets, selectedBookId]);

  const recentTransactions = useMemo(() => {
    return [...bookTransactions]
      .sort((a, b) => (Date.parse(b.occurredAt) || 0) - (Date.parse(a.occurredAt) || 0))
      .slice(0, 4);
  }, [bookTransactions]);

  const assistantState: CharacterState = !isHydrated ? "thinking" : recentTransactions.length > 0 ? "happy" : "waiting";

  const retryHydration = () => {
    setHydrationError(false);
    setBooksHydrated(booksPersist?.hasHydrated?.() ?? true);
    setTxHydrated(txPersist?.hasHydrated?.() ?? true);
    setBudgetsHydrated(budgetsPersist?.hasHydrated?.() ?? true);
    booksPersist?.rehydrate?.();
    txPersist?.rehydrate?.();
    budgetsPersist?.rehydrate?.();
  };

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 12 }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 120 }}
      >
        <View className="px-6">
          <View className="flex-row items-center justify-between">
            <BookPill label={selectedBookName} onPress={() => router.push("/modals/book-switcher")} />

            <HapticPressable
              onPress={() => router.push("/modals/add-transaction")}
              haptic="impactLight"
              className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface"
              android_ripple={{ color: "#FFFFFF12", borderless: true }}
            >
              <Ionicons name="add" size={20} color={tokens.colors.accent} />
            </HapticPressable>
          </View>

          <AppText variant="sm" tone="muted" className="mt-3">
            Dashboard
          </AppText>

          <Card variant="surface" className="mt-6">
            <View className="flex-row items-center">
              <CharacterWidget state={assistantState} size={44} />
              <View className="ml-3 flex-1">
                <AppText variant="base" style={{ fontFamily: "Inter_600SemiBold" }}>
                  Assistant
                </AppText>

                {!isHydrated ? (
                  <StreamingText text="Syncing your budget data..." speedMs={18} style={tokens.typography.sm as any} className="text-muted mt-1" />
                ) : recentTransactions.length > 0 ? (
                  <AppText variant="sm" tone="muted" className="mt-1">
                    Latest transactions are reflected in real time.
                  </AppText>
                ) : (
                  <AppText variant="sm" tone="muted" className="mt-1">
                    Add your first transaction to unlock insights.
                  </AppText>
                )}
              </View>
            </View>
          </Card>
        </View>

        {hydrationError ? (
          <View className="px-6 mt-6">
            <EmptyState
              title="Couldn’t load dashboard"
              message="Retry to reload books, transactions, and budgets."
              actionLabel="Retry"
              onAction={retryHydration}
              className="px-0"
            />
          </View>
        ) : !isHydrated ? (
          <View className="px-6 mt-6 gap-3">
            <Skeleton height={180} borderRadius={24} />
            <Skeleton height={160} borderRadius={24} />
            <Skeleton height={220} borderRadius={24} />
          </View>
        ) : (
          <>
            <View className="px-6 mt-6">
              <Card variant="surface">
                <AppText variant="xs" tone="muted" className="uppercase">
                  Total balance
                </AppText>
                <AppText variant="amount" className="mt-2" style={{ color: balance.netCents < 0 ? tokens.colors.danger : tokens.colors.text }}>
                  {formatMoney2(balance.netCents)}
                </AppText>

                <View className="mt-4 flex-row">
                  <View className="flex-1 rounded-lg border border-stroke bg-card p-3 mr-2">
                    <AppText variant="xs" tone="muted">
                      Income
                    </AppText>
                    <AppText variant="base" className="mt-1" style={{ color: tokens.colors.accent, fontFamily: "Inter_600SemiBold" }}>
                      {formatMoney2(balance.incomeCents)}
                    </AppText>
                  </View>

                  <View className="flex-1 rounded-lg border border-stroke bg-card p-3 ml-2">
                    <AppText variant="xs" tone="muted">
                      Expense
                    </AppText>
                    <AppText variant="base" className="mt-1" style={{ fontFamily: "Inter_600SemiBold" }}>
                      {formatMoney2(balance.expenseCents)}
                    </AppText>
                  </View>
                </View>
              </Card>
            </View>

            <View className="px-6 mt-6">
              <View className="flex-row items-center justify-between">
                <AppText variant="xl">Budgets</AppText>
                <HapticPressable
                  onPress={() => router.push("/(tabs)/categories")}
                  haptic="selection"
                  pressScale={0.98}
                  className="min-h-11 px-4 rounded-full items-center justify-center"
                  android_ripple={{ color: "#FFFFFF10", borderless: true }}
                >
                  <AppText variant="sm" className="text-accent">
                    Manage
                  </AppText>
                </HapticPressable>
              </View>

              {budgetItems.length === 0 ? (
                <Card variant="surface" className="mt-3">
                  <EmptyState
                    title="No budgets yet"
                    message="Set category budgets to track monthly progress."
                    actionLabel="Set budget"
                    onAction={() => router.push("/(tabs)/categories")}
                    className="px-0"
                  />
                </Card>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingTop: 12, paddingRight: 24 }}
                >
                  {budgetItems.slice(0, 6).map((item) => (
                    <View key={item.category} className="mr-3">
                      <BudgetTile item={item} />
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            <View className="px-6 mt-6">
              <View className="flex-row items-center justify-between">
                <AppText variant="xl">Recent transactions</AppText>
                <HapticPressable
                  onPress={() => router.push("/(tabs)/transactions")}
                  haptic="selection"
                  pressScale={0.98}
                  className="min-h-11 px-4 rounded-full items-center justify-center"
                  android_ripple={{ color: "#FFFFFF10", borderless: true }}
                >
                  <AppText variant="sm" className="text-accent">
                    View all
                  </AppText>
                </HapticPressable>
              </View>

              {recentTransactions.length === 0 ? (
                <Card variant="surface" className="mt-3">
                  <EmptyState
                    title="No transactions yet"
                    message="Add a transaction to start building your timeline."
                    actionLabel="Add transaction"
                    onAction={() => router.push("/modals/add-transaction")}
                    className="px-0"
                  />
                </Card>
              ) : (
                <View className="mt-3 gap-2">
                  {recentTransactions.map((tx) => (
                    <TransactionRow key={tx.id} item={tx} />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
