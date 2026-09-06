import { useEffect, useMemo, useState } from "react";
import { View, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay, parseISO, subDays } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { Screen } from "@/shared/ui/components/Screen";
import { Card } from "@/shared/ui/components/Card";
import { AppText } from "@/shared/ui/components/AppText";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { TransactionRow } from "@/shared/ui/components/TransactionRow";
import { IconButton } from "@/shared/ui/components/IconButton";
import { SectionHeader } from "@/shared/ui/components/SectionHeader";
import { StatBlock } from "@/shared/ui/components/StatBlock";
import { HeroAmount, MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { TrendAreaChart, type AreaPoint } from "@/shared/ui/components/TrendAreaChart";
import { BreakdownRow } from "@/shared/ui/components/BreakdownRow";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

import { useAuthStore } from "@/features/auth/store";
import { useBooksStore } from "@/features/books/store";
import { useCategoriesStore } from "@/features/categories/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useBudgetsStore } from "@/features/budgets/store";
import { useSettingsStore } from "@/features/settings/store";
import * as summaryApi from "@/shared/api/summary";
import { currencySymbol, formatCurrency, formatCurrencyDigits } from "@/shared/utils/formatCurrency";
import { balanceColor } from "@/shared/ui/theme/money";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { withAlpha } from "@/shared/ui/theme/color";
import { useCountUp } from "@/shared/ui/utils/useCountUp";

function nowMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * The greeting is one of exactly four places the product allows an emoji (the
 * others are the success sub-line, empty states and the note placeholder), and
 * it doubles as a non-text cue for the time of day.
 */
function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return { emoji: "\u{1F305}", text: "Good morning" };
  if (h < 18) return { emoji: "\u2600\uFE0F", text: "Good afternoon" };
  return { emoji: "\u{1F319}", text: "Good evening" };
}

function safeDate(iso: string) {
  try {
    const d = parseISO(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

type BudgetItem = {
  categoryId: string;
  categoryName: string;
  spentMinor: number;
  budgetMinor: number;
};

/** A budget's progress, as a compact tile in the horizontal budgets rail. */
function BudgetPreview({ item, currency }: { item: BudgetItem; currency: string }) {
  const remaining = item.budgetMinor - item.spentMinor;
  const progress = Math.min(1, item.spentMinor / Math.max(1, item.budgetMinor));
  const over = remaining < 0;
  const barColor = over ? tokens.colors.danger : tokens.colors.accent;

  return (
    <Card variant="surface" padding={16} style={{ width: 200 }}>
      <AppText variant="sm" weight="semibold" numberOfLines={1}>
        {item.categoryName}
      </AppText>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          gap: tokens.space[1],
          marginTop: tokens.space[1],
        }}
      >
        <MoneyAmount
          value={formatCurrency(item.spentMinor, currency, 0)}
          tone="neutral"
          size="sm"
          weight="semibold"
          color={tokens.colors.muted}
        />
        <AppText variant="xs" tone="muted" numberOfLines={1}>
          SPENT
        </AppText>
      </View>

      <View
        style={{
          height: 6,
          marginTop: tokens.space[4],
          borderRadius: tokens.radii.pill,
          backgroundColor: tokens.colors.neutralSoft,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: 6,
            borderRadius: tokens.radii.pill,
            backgroundColor: barColor,
          }}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          gap: tokens.space[1],
          marginTop: tokens.space[3],
        }}
      >
        <MoneyAmount
          value={formatCurrency(Math.abs(remaining), currency, 0)}
          tone="neutral"
          size="sm"
          color={barColor}
        />
        <AppText variant="sm" weight="semibold" style={{ color: barColor }}>
          {over ? "over" : "left"}
        </AppText>
      </View>
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
  const categories = useCategoriesStore((s) => s.categories);
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
  const selectedBookName = useMemo(
    () => books.find((b) => b.id === selectedBookId)?.name ?? "Personal",
    [books, selectedBookId]
  );
  const selectedBook = useMemo(() => books.find((b) => b.id === selectedBookId) ?? null, [books, selectedBookId]);
  const currentMonth = useMemo(() => nowMonthKey(), []);
  const monthShort = useMemo(() => format(new Date(), "MMM"), []);
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

  const bookTransactions = useMemo(
    () => transactions.filter((t) => t.bookId === selectedBookId),
    [transactions, selectedBookId]
  );

  // Last seven days of spending, from the transactions already loaded. Days
  // with no activity render as an empty column rather than being skipped, so
  // the shape of the week stays honest.
  const weekSpend = useMemo<AreaPoint[]>(() => {
    const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));

    return days.map((day) => {
      const total = bookTransactions.reduce((sum, tx) => {
        if (tx.type !== "EXPENSE") return sum;
        const when = safeDate(tx.occurredOn || tx.occurredAt);
        if (!when || !isSameDay(when, day)) return sum;
        return sum + tx.amountMinor;
      }, 0);

      return { label: format(day, "EEEEE"), value: total };
    });
  }, [bookTransactions]);

  const weekTotal = useMemo(() => weekSpend.reduce((sum, d) => sum + d.value, 0), [weekSpend]);

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
    if (apiItems.length > 0)
      return apiItems.sort(
        (a, b) => b.spentMinor / Math.max(1, b.budgetMinor) - a.spentMinor / Math.max(1, a.budgetMinor)
      );

    return budgets
      .filter((b) => b.bookId === selectedBookId && b.month === currentMonth)
      .map((b) => ({
        categoryId: b.categoryId,
        categoryName: b.categoryName,
        budgetMinor: b.amountMinor,
        spentMinor: b.spentMinor,
      }))
      .sort((a, b) => b.spentMinor / Math.max(1, b.budgetMinor) - a.spentMinor / Math.max(1, a.budgetMinor));
  }, [budgets, currentMonth, selectedBookId, summaryQuery.data?.byCategory]);

  // Top spending comes from the same verified monthly summary Insights uses,
  // so the two screens can never disagree.
  const topSpending = useMemo(() => {
    const rows =
      summaryQuery.data?.byCategory
        .filter((item) => item.type === "EXPENSE" && item.totalMinor > 0)
        .map((item) => ({
          id: item.categoryId,
          name: item.categoryName,
          minor: item.totalMinor,
          color: categories.find((c) => c.id === item.categoryId)?.color ?? tokens.colors.accent,
          icon: categories.find((c) => c.id === item.categoryId)?.icon,
        }))
        .sort((a, b) => b.minor - a.minor) ?? [];
    const total = rows.reduce((sum, r) => sum + r.minor, 0);
    return { rows: rows.slice(0, 4), total };
  }, [categories, summaryQuery.data?.byCategory]);

  const recentTransactions = useMemo(
    () =>
      [...bookTransactions]
        .sort((a, b) => (Date.parse(b.occurredAt) || 0) - (Date.parse(a.occurredAt) || 0))
        .slice(0, 4),
    [bookTransactions]
  );

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
      await ensureBook({ name: "Personal", currencyCode: primaryCurrency, openingBalanceMinor: 0 });
    } catch (error) {
      showError(error, "Couldn’t restore your cash book.");
    } finally {
      setIsRestoringBook(false);
    }
  };

  const dashboardCurrency =
    balanceQuery.data?.currencyCode ??
    summaryQuery.data?.currencyCode ??
    selectedBook?.currencyCode ??
    primaryCurrency;
  const incomeMinor = summaryQuery.data?.incomeTotalMinor;
  const expenseMinor = summaryQuery.data?.expenseTotalMinor;
  const balanceMinor = balanceQuery.data?.balanceMinor;

  // The balance counts up when it first lands and again when a save changes
  // it - never on a plain re-render, so returning to the tab is silent.
  const countedBalance = useCountUp(balanceMinor);

  const { emoji, text: greetingText } = greeting();

  return (
    <Screen scroll bottom="tab" ambient="accent">
      {/* Greeting */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <LinearGradient
          colors={[withAlpha(tokens.colors.income, 1), tokens.colors.accentPressed]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 48,
            height: 48,
            borderRadius: tokens.radii.pill,
            alignItems: "center",
            justifyContent: "center",
            ...tokens.glow.accentSoft,
          }}
        >
          <AppText variant="base" weight="bold" style={{ color: tokens.colors.onAccent }}>
            {displayName.slice(0, 1).toUpperCase()}
          </AppText>
        </LinearGradient>

        <View style={{ flex: 1, marginLeft: tokens.space[3] }}>
          <AppText variant="sm" tone="muted">
            {emoji} {greetingText}
          </AppText>
          <AppText variant="lg" numberOfLines={1}>
            {displayName}
          </AppText>
        </View>

        <IconButton
          icon="settings-outline"
          accessibilityLabel="Settings"
          onPress={() => router.push("/(tabs)/settings")}
        />
      </View>

      {hydrationError ? (
        <View style={{ marginTop: tokens.space[7] }}>
          <EmptyState
            title="Couldn’t load dashboard"
            message="Retry to reload books, transactions, and budgets."
            actionLabel="Retry"
            onAction={retryHydration}
            tone="danger"
          />
        </View>
      ) : !isHydrated ? (
        <View style={{ marginTop: tokens.space[7], gap: tokens.space[4] }}>
          <Skeleton height={96} borderRadius={16} />
          <Skeleton height={180} borderRadius={20} />
          <Skeleton height={200} borderRadius={20} />
        </View>
      ) : !selectedBookId ? (
        <View style={{ marginTop: tokens.space[8] }}>
          <EmptyState
            title="Cash book unavailable"
            message="Your account is signed in, but its cash book could not be restored."
            actionLabel={isRestoringBook ? "Retrying…" : "Retry setup"}
            onAction={() => {
              void restoreBook();
            }}
            tone="danger"
          />
        </View>
      ) : (
        <>
          {/* Balance - the single strongest element on the screen. */}
          <View style={{ marginTop: tokens.space[7] }}>
            {balanceQuery.isPending ? (
              <Skeleton height={96} borderRadius={16} />
            ) : balanceMinor === undefined ? (
              <Card variant="surface" padding={20}>
                <EmptyState
                  title="Couldn’t load balance"
                  message="The balance stays hidden until it can be verified with the server."
                  actionLabel="Retry"
                  tone="danger"
                  onAction={() => {
                    void balanceQuery.refetch();
                    void summaryQuery.refetch();
                  }}
                />
              </Card>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[2] }}>
                  <AppText variant="xs" tone="muted">
                    TOTAL BALANCE
                  </AppText>
                  <View
                    style={{
                      paddingHorizontal: tokens.space[2],
                      paddingVertical: 2,
                      borderRadius: tokens.radii.pill,
                      backgroundColor: tokens.colors.neutralSoft,
                    }}
                  >
                    <AppText variant="xs" tone="muted">
                      {dashboardCurrency}
                    </AppText>
                  </View>
                </View>
                <View style={{ marginTop: tokens.space[2] }}>
                  {/*
                    The hero splits the currency symbol out at half size in the
                    tertiary color - the one place the system allows two sizes
                    in one figure - so the digits carry all the weight.
                    `countedBalance` animates; the accessibility label states
                    the settled value so a screen reader never reads a
                    mid-animation number.
                  */}
                  <HeroAmount
                    value={formatCurrencyDigits(countedBalance, dashboardCurrency)}
                    symbol={currencySymbol(dashboardCurrency)}
                    color={balanceColor(balanceMinor)}
                    accessibilityLabel={`Total balance ${formatCurrency(balanceMinor, dashboardCurrency)}`}
                  />
                </View>

                {incomeMinor === undefined || expenseMinor === undefined ? (
                  <View style={{ marginTop: tokens.space[6] }}>
                    <Skeleton height={48} borderRadius={16} />
                  </View>
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      marginTop: tokens.space[5],
                      gap: tokens.space[4],
                    }}
                  >
                    <StatBlock
                      label={`Income · ${monthShort}`}
                      value={formatCurrency(incomeMinor, dashboardCurrency)}
                      tone="income"
                    />
                    <StatBlock
                      label={`Spent · ${monthShort}`}
                      value={formatCurrency(expenseMinor, dashboardCurrency)}
                      tone="expense"
                    />
                  </View>
                )}
              </>
            )}
          </View>

          {/* Weekly spend */}
          <View style={{ marginTop: tokens.space[7] }}>
            <SectionHeader
              title="This week"
              action={
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: tokens.space[1] }}>
                  <MoneyAmount
                    value={formatCurrency(weekTotal, dashboardCurrency)}
                    tone="neutral"
                    size="sm"
                    weight="semibold"
                    color={tokens.colors.muted}
                  />
                  <AppText variant="sm" tone="muted">
                    spent
                  </AppText>
                </View>
              }
            />
            <View style={{ marginTop: tokens.space[4] }}>
              <TrendAreaChart
                data={weekSpend}
                height={190}
                formatValue={(minor) => formatCurrency(minor, dashboardCurrency)}
                accessibilityLabel="Spending over the last seven days"
              />
            </View>
          </View>

          {/* Top spending */}
          {topSpending.rows.length > 0 ? (
            <View style={{ marginTop: tokens.space[7] }}>
              <SectionHeader
                title="Top spending"
                action={
                  <HapticPressable
                    onPress={() => router.push("/(tabs)/analytics")}
                    haptic="none"
                    style={{ minHeight: tokens.layout.minTap, justifyContent: "center" }}
                  >
                    <AppText variant="sm" weight="semibold" style={{ color: tokens.colors.accent }}>
                      Insights
                    </AppText>
                  </HapticPressable>
                }
              />
              <View style={{ marginTop: tokens.space[1] }}>
                {topSpending.rows.map((row) => (
                  <BreakdownRow
                    key={row.id}
                    name={row.name}
                    icon={row.icon}
                    color={row.color}
                    amount={formatCurrency(row.minor, dashboardCurrency)}
                    share={topSpending.total > 0 ? row.minor / topSpending.total : 0}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Recent activity */}
          <View style={{ marginTop: tokens.space[7] }}>
            <SectionHeader
              title="Recent"
              action={
                <HapticPressable
                  onPress={() => router.push("/(tabs)/transactions")}
                  haptic="none"
                  style={{ minHeight: tokens.layout.minTap, justifyContent: "center" }}
                >
                  <AppText variant="sm" weight="semibold" style={{ color: tokens.colors.accent }}>
                    View all
                  </AppText>
                </HapticPressable>
              }
            />

            {recentTransactions.length === 0 ? (
              <View style={{ marginTop: tokens.space[6] }}>
                <EmptyState
                  iconName="receipt-outline"
                  title="No transactions yet"
                  message="Your transactions will appear here."
                  actionLabel="Add transaction"
                  onAction={() => router.push("/modals/add-transaction")}
                />
              </View>
            ) : (
              <View style={{ marginTop: tokens.space[1] }}>
                {recentTransactions.map((tx, index) => (
                  <View key={tx.id}>
                    <TransactionRow item={tx} enableActions={false} embedded />
                    {index !== recentTransactions.length - 1 ? (
                      <View style={{ height: 1, backgroundColor: tokens.colors.divider }} />
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Budgets */}
          {budgetItems.length > 0 ? (
            <View style={{ marginTop: tokens.space[7] }}>
              <SectionHeader
                title="Budgets"
                action={
                  <HapticPressable
                    onPress={() => router.push("/(tabs)/categories")}
                    haptic="none"
                    style={{ minHeight: tokens.layout.minTap, justifyContent: "center" }}
                  >
                    <AppText variant="sm" weight="semibold" style={{ color: tokens.colors.accent }}>
                      Manage
                    </AppText>
                  </HapticPressable>
                }
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: tokens.space[3],
                  paddingTop: tokens.space[4],
                  paddingRight: tokens.space[5],
                }}
              >
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
