import { useEffect, useMemo, useState } from "react";
import { View, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { tokens } from "@/shared/ui/theme/tokens";
import { Screen } from "@/shared/ui/components/Screen";
import { Card } from "@/shared/ui/components/Card";
import { AppText } from "@/shared/ui/components/AppText";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { TransactionRow } from "@/shared/ui/components/TransactionRow";
import { IconButton } from "@/shared/ui/components/IconButton";
import { SectionHeader } from "@/shared/ui/components/SectionHeader";
import { SummaryStat } from "@/shared/ui/components/SummaryStat";
import { CategoryIcon } from "@/shared/ui/components/CategoryIcon";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

import { useAuthStore } from "@/features/auth/store";
import { useBooksStore } from "@/features/books/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useBudgetsStore } from "@/features/budgets/store";
import { useSettingsStore } from "@/features/settings/store";
import * as summaryApi from "@/shared/api/summary";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";

function nowMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type BudgetItem = {
  categoryId: string;
  categoryName: string;
  spentMinor: number;
  budgetMinor: number;
};

function BudgetPreview({ item, currency }: { item: BudgetItem; currency: string }) {
  const remaining = item.budgetMinor - item.spentMinor;
  const progress = Math.min(1, item.spentMinor / Math.max(1, item.budgetMinor));
  const over = remaining < 0;

  return (
    <Card style={{ width: 214 }} elevated>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <CategoryIcon icon="pie-chart-outline" color={over ? tokens.colors.danger : tokens.colors.accent} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="base" style={{ fontFamily: "Inter_700Bold" }} numberOfLines={1}>
            {item.categoryName}
          </AppText>
          <AppText variant="sm" tone="muted" numberOfLines={1}>
            {formatCurrency(item.spentMinor, currency, 0)} spent
          </AppText>
        </View>
      </View>
      <View
        style={{
          height: 8,
          marginTop: 18,
          borderRadius: tokens.radii.pill,
          backgroundColor: tokens.colors.neutralSoft,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: 8,
            borderRadius: tokens.radii.pill,
            backgroundColor: over ? tokens.colors.danger : tokens.colors.accent,
          }}
        />
      </View>
      <AppText
        variant="sm"
        style={{ marginTop: 14, color: over ? tokens.colors.danger : tokens.colors.accent, fontFamily: "Inter_700Bold" }}
      >
        {over ? `${formatCurrency(Math.abs(remaining), currency, 0)} over` : `${formatCurrency(remaining, currency, 0)} left`}
      </AppText>
    </Card>
  );
}

export default function Home() {
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const books = useBooksStore((s) => s.books);
  const ensureBook = useBooksStore((s) => s.ensureBook);
  const transactions = useTransactionsStore((s) => s.transactions);
  const budgets = useBudgetsStore((s) => s.budgets);
  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);
  const showError = useUndoToastStore((s) => s.showError);
  const [isRestoringBook, setIsRestoringBook] = useState(false);

  const booksPersist = (useBooksStore as any).persist;
  const txPersist = (useTransactionsStore as any).persist;
  const budgetsPersist = (useBudgetsStore as any).persist;

  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => booksPersist?.hasHydrated?.() ?? true);
  const [txHydrated, setTxHydrated] = useState<boolean>(() => txPersist?.hasHydrated?.() ?? true);
  const [budgetsHydrated, setBudgetsHydrated] = useState<boolean>(() => budgetsPersist?.hasHydrated?.() ?? true);
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
      if (!booksReady || !txReady || !budgetsReady) setHydrationError(true);
    }, 3000);
    return () => {
      clearTimeout(timeoutId);
      for (const unsub of unsubs) unsub?.();
    };
  }, [booksPersist, budgetsPersist, txPersist]);

  const isHydrated = booksHydrated && txHydrated && budgetsHydrated;
  const selectedBookName = useMemo(() => books.find((b) => b.id === selectedBookId)?.name ?? "Personal", [books, selectedBookId]);
  const selectedBook = useMemo(() => books.find((b) => b.id === selectedBookId) ?? null, [books, selectedBookId]);
  const currentMonth = useMemo(() => nowMonthKey(), []);
  const displayName = useMemo(() => {
    const name = user?.email?.split("@")[0]?.trim();
    return name ? name.slice(0, 1).toUpperCase() + name.slice(1) : selectedBookName;
  }, [selectedBookName, user?.email]);

  const balanceQuery = useQuery({
    queryKey: ["balance", selectedBookId],
    queryFn: () => summaryApi.getBalance(selectedBookId),
    enabled: Boolean(selectedBookId),
  });

  const summaryQuery = useQuery({
    queryKey: ["summary", selectedBookId, currentMonth],
    queryFn: () => summaryApi.getMonthlySummary(selectedBookId, currentMonth),
    enabled: Boolean(selectedBookId),
  });

  const bookTransactions = useMemo(() => transactions.filter((t) => t.bookId === selectedBookId), [transactions, selectedBookId]);

  const budgetItems = useMemo(() => {
    const apiItems =
      summaryQuery.data?.byCategory
        .filter((item) => item.type === "EXPENSE" && (item.budgetMinor ?? 0) > 0)
        .map((item) => ({
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          budgetMinor: item.budgetMinor ?? 0,
          spentMinor: item.totalMinor,
        })) ?? [];
    if (apiItems.length > 0) return apiItems.sort((a, b) => b.spentMinor / Math.max(1, b.budgetMinor) - a.spentMinor / Math.max(1, a.budgetMinor));

    return budgets
      .filter((b) => b.bookId === selectedBookId && b.month === currentMonth)
      .map((b) => ({ categoryId: b.categoryId, categoryName: b.categoryName, budgetMinor: b.amountMinor, spentMinor: b.spentMinor }))
      .sort((a, b) => b.spentMinor / Math.max(1, b.budgetMinor) - a.spentMinor / Math.max(1, a.budgetMinor));
  }, [budgets, currentMonth, selectedBookId, summaryQuery.data?.byCategory]);

  const recentTransactions = useMemo(() => {
    return [...bookTransactions].sort((a, b) => (Date.parse(b.occurredAt) || 0) - (Date.parse(a.occurredAt) || 0)).slice(0, 4);
  }, [bookTransactions]);

  const retryHydration = () => {
    setHydrationError(false);
    setBooksHydrated(booksPersist?.hasHydrated?.() ?? true);
    setTxHydrated(txPersist?.hasHydrated?.() ?? true);
    setBudgetsHydrated(budgetsPersist?.hasHydrated?.() ?? true);
    booksPersist?.rehydrate?.();
    txPersist?.rehydrate?.();
    budgetsPersist?.rehydrate?.();
  };

  const restoreBook = async () => {
    if (isRestoringBook) return;
    setIsRestoringBook(true);
    try {
      await ensureBook({
        name: "Personal",
        currencyCode: primaryCurrency,
        openingBalanceMinor: 0,
      });
    } catch (error) {
      showError(error, "Couldn’t restore your cash book.");
    } finally {
      setIsRestoringBook(false);
    }
  };

  const dashboardCurrency = balanceQuery.data?.currencyCode ?? summaryQuery.data?.currencyCode ?? selectedBook?.currencyCode ?? primaryCurrency;
  const incomeMinor = summaryQuery.data?.incomeTotalMinor;
  const expenseMinor = summaryQuery.data?.expenseTotalMinor;
  const balanceMinor = balanceQuery.data?.balanceMinor;

  return (
    <Screen scroll bottom="tab">
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 1,
            borderColor: tokens.colors.stroke,
            backgroundColor: tokens.colors.greenSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppText variant="xl" style={{ color: tokens.colors.accent, fontFamily: "Inter_700Bold" }}>
            {displayName.slice(0, 1).toUpperCase()}
          </AppText>
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <AppText variant="lg" tone="muted">
            Good morning,
          </AppText>
          <AppText variant="2xl">{displayName}</AppText>
        </View>
        <IconButton icon="settings-outline" onPress={() => router.push("/(tabs)/settings")} />
      </View>

      {hydrationError ? (
        <View style={{ marginTop: 24 }}>
          <EmptyState
            title="Couldn’t load dashboard"
            message="Retry to reload books, transactions, and budgets."
            actionLabel="Retry"
            onAction={retryHydration}
            className="px-0"
          />
        </View>
      ) : !isHydrated ? (
        <View style={{ marginTop: 24, gap: 12 }}>
          <Skeleton height={236} borderRadius={24} />
          <Skeleton height={68} borderRadius={24} />
          <Skeleton height={260} borderRadius={24} />
        </View>
      ) : !selectedBookId ? (
        <Card style={{ marginTop: 28 }}>
          <EmptyState
            title="Cash book unavailable"
            message="Your account is signed in, but its cash book could not be restored."
            actionLabel={isRestoringBook ? "Retrying..." : "Retry setup"}
            onAction={() => {
              void restoreBook();
            }}
            className="px-0"
          />
        </Card>
      ) : (
        <>
          <Card style={{ marginTop: 28, overflow: "hidden" }}>
            {balanceQuery.isPending ? (
              <Skeleton height={96} borderRadius={16} />
            ) : balanceMinor === undefined ? (
              <EmptyState
                title="Couldn’t load balance"
                message="The balance is hidden until it can be verified with the server."
                actionLabel="Retry"
                onAction={() => {
                  void balanceQuery.refetch();
                  void summaryQuery.refetch();
                }}
                className="px-0"
              />
            ) : (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View>
                    <AppText variant="lg" tone="muted">
                      Total Balance
                    </AppText>
                    <AppText
                      variant="amount"
                      style={{ marginTop: 14, color: balanceMinor < 0 ? tokens.colors.danger : tokens.colors.text }}
                    >
                      {formatCurrency(balanceMinor, dashboardCurrency)}
                    </AppText>
                  </View>
                  <View
                    style={{
                      minHeight: 44,
                      borderRadius: tokens.radii.pill,
                      borderWidth: 1,
                      borderColor: tokens.colors.stroke,
                      paddingHorizontal: 16,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <AppText variant="sm" style={{ fontFamily: "Inter_600SemiBold" }}>
                      {dashboardCurrency}
                    </AppText>
                  </View>
                </View>
                {incomeMinor === undefined || expenseMinor === undefined ? (
                  <View style={{ marginTop: 20 }}>
                    <Skeleton height={68} borderRadius={16} />
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                    <SummaryStat label="Income this month" value={formatCurrency(incomeMinor, dashboardCurrency)} tone="income" />
                    <SummaryStat label="Expense this month" value={formatCurrency(expenseMinor, dashboardCurrency)} tone="expense" />
                  </View>
                )}
              </>
            )}
          </Card>

          <View style={{ marginTop: 28 }}>
            <SectionHeader
              title="Recent Transactions"
              action={
                <HapticPressable onPress={() => router.push("/(tabs)/transactions")} haptic="selection" style={{ padding: 8 }}>
                  <AppText variant="base" style={{ color: tokens.colors.accent, fontFamily: "Inter_700Bold" }}>
                    View all
                  </AppText>
                </HapticPressable>
              }
            />
            {recentTransactions.length === 0 ? (
              <Card style={{ marginTop: 12 }}>
                <EmptyState
                  title="No transactions yet"
                  message="Add a transaction to start building your timeline."
                  actionLabel="Add transaction"
                  onAction={() => router.push("/modals/add-transaction")}
                  className="px-0"
                />
              </Card>
            ) : (
              <Card padding={0} style={{ marginTop: 12, overflow: "hidden" }}>
                {recentTransactions.map((tx, index) => (
                  <View key={tx.id}>
                    <TransactionRow item={tx} enableActions={false} embedded />
                    {index !== recentTransactions.length - 1 ? (
                      <View style={{ height: 1, marginLeft: 84, backgroundColor: tokens.colors.stroke }} />
                    ) : null}
                  </View>
                ))}
              </Card>
            )}
          </View>

          {budgetItems.length > 0 ? (
            <View style={{ marginTop: 28 }}>
              <SectionHeader
                title="Budgets"
                action={
                  <HapticPressable onPress={() => router.push("/(tabs)/categories")} haptic="selection" style={{ padding: 8 }}>
                    <AppText variant="base" style={{ color: tokens.colors.accent, fontFamily: "Inter_700Bold" }}>
                      Manage
                    </AppText>
                  </HapticPressable>
                }
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 12, paddingRight: 24 }}>
                {budgetItems.slice(0, 6).map((item) => (
                  <BudgetPreview key={item.categoryId} item={item} currency={dashboardCurrency} />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
