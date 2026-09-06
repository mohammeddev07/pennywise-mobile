import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addMonths, differenceInCalendarDays, endOfMonth, format, isSameMonth, parseISO, startOfMonth } from "date-fns";
import { useRouter } from "expo-router";
import { useQueries, useQuery } from "@tanstack/react-query";

import { tokens } from "@/shared/ui/theme/tokens";
import { useCategoriesStore } from "@/features/categories/store";
import { useBooksStore } from "@/features/books/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useBookCurrency } from "@/features/books/useBookCurrency";
import { AppText } from "@/shared/ui/components/AppText";
import { BreakdownRow } from "@/shared/ui/components/BreakdownRow";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { IconButton } from "@/shared/ui/components/IconButton";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { ScreenHeader } from "@/shared/ui/components/ScreenHeader";
import { SectionHeader } from "@/shared/ui/components/SectionHeader";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { StatBlock } from "@/shared/ui/components/StatBlock";
import { TrendChart, type TrendPoint } from "@/shared/ui/components/TrendChart";
import { useScreenPaddingX, useTabBarClearance } from "@/shared/ui/components/Screen";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { balanceColor } from "@/shared/ui/theme/money";
import * as summaryApi from "@/shared/api/summary";

const TREND_MONTHS = 6;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function safeDate(iso: string) {
  try {
    const d = parseISO(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paddingX = useScreenPaddingX();
  const tabClearance = useTabBarClearance();

  const categories = useCategoriesStore((s) => s.categories);
  const transactions = useTransactionsStore((s) => s.transactions);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);

  const catsPersist = (useCategoriesStore as any).persist;
  const booksPersist = (useBooksStore as any).persist;

  const [catsHydrated, setCatsHydrated] = useState<boolean>(() => catsPersist?.hasHydrated?.() ?? true);
  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => booksPersist?.hasHydrated?.() ?? true);
  const [hydrationError, setHydrationError] = useState(false);

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

    const timeoutId = setTimeout(() => {
      const catsReady = catsPersist?.hasHydrated ? catsPersist.hasHydrated() : true;
      const booksReady = booksPersist?.hasHydrated ? booksPersist.hasHydrated() : true;
      if (!catsReady || !booksReady) {
        setHydrationError(true);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      for (const unsub of unsubs) unsub?.();
    };
  }, [booksPersist, catsPersist]);

  const retryHydration = () => {
    setHydrationError(false);
    setCatsHydrated(catsPersist?.hasHydrated?.() ?? true);
    setBooksHydrated(booksPersist?.hasHydrated?.() ?? true);
    catsPersist?.rehydrate?.();
    booksPersist?.rehydrate?.();
  };

  const hydrated = catsHydrated && booksHydrated;

  const thisMonth = useMemo(() => startOfMonth(new Date()), []);
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const month = monthKey(selectedMonth);
  const monthLabel = format(selectedMonth, "MMMM yyyy");
  const isCurrentMonth = isSameMonth(selectedMonth, thisMonth);
  const bookCurrency = useBookCurrency(selectedBookId);

  const summaryQuery = useQuery({
    queryKey: ["summary", selectedBookId, month],
    queryFn: () => summaryApi.getMonthlySummary(selectedBookId, month),
    enabled: Boolean(selectedBookId),
  });

  // The trend is six real monthly summaries, not an extrapolation of what
  // happens to be cached locally. React Query dedupes these against the
  // summary the rest of the app already fetches.
  const trendMonths = useMemo(
    () => Array.from({ length: TREND_MONTHS }, (_, i) => addMonths(selectedMonth, -(TREND_MONTHS - 1 - i))),
    [selectedMonth]
  );

  const trendQueries = useQueries({
    queries: trendMonths.map((d) => ({
      queryKey: ["summary", selectedBookId, monthKey(d)],
      queryFn: () => summaryApi.getMonthlySummary(selectedBookId, monthKey(d)),
      enabled: Boolean(selectedBookId),
    })),
  });

  const trend = useMemo<TrendPoint[]>(
    () =>
      trendMonths.map((d, i) => ({
        label: format(d, "MMM"),
        value: trendQueries[i]?.data?.expenseTotalMinor ?? 0,
        current: i === trendMonths.length - 1,
      })),
    [trendMonths, trendQueries]
  );

  const totals = useMemo(() => {
    const summary = summaryQuery.data;
    if (!summary) return null;
    return {
      incomeCents: summary.incomeTotalMinor,
      expenseCents: summary.expenseTotalMinor,
      netCents: summary.incomeTotalMinor - summary.expenseTotalMinor,
    };
  }, [summaryQuery.data]);

  const breakdown = useMemo(() => {
    const rows =
      summaryQuery.data?.byCategory
        .filter((item) => item.type === "EXPENSE" && item.totalMinor > 0)
        .map((item) => {
          const hit = categories.find((c) => c.id === item.categoryId);
          return {
            id: item.categoryId,
            name: item.categoryName,
            cents: item.totalMinor,
            icon: hit?.icon,
            color: hit?.color ?? tokens.colors.accent,
          };
        })
        .sort((a, b) => b.cents - a.cents) ?? [];
    const total = rows.reduce((sum, row) => sum + row.cents, 0);
    return { rows, total };
  }, [categories, summaryQuery.data]);

  // Largest single expense comes from loaded records, so it is only shown when
  // one is actually present for the month being viewed.
  const largestExpense = useMemo(() => {
    const inMonth = transactions.filter((tx) => {
      if (tx.bookId !== selectedBookId || tx.type !== "EXPENSE") return false;
      const when = safeDate(tx.occurredOn || tx.occurredAt);
      return when ? isSameMonth(when, selectedMonth) : false;
    });
    if (inMonth.length === 0) return null;
    return inMonth.reduce((max, tx) => (tx.amountMinor > max.amountMinor ? tx : max), inMonth[0]);
  }, [selectedBookId, selectedMonth, transactions]);

  const dailyAverage = useMemo(() => {
    if (!totals) return null;
    // Month-to-date for the current month, full month for a past one, so the
    // average is never diluted by days that have not happened yet.
    const days = isCurrentMonth
      ? Math.max(1, differenceInCalendarDays(new Date(), selectedMonth) + 1)
      : Math.max(1, differenceInCalendarDays(endOfMonth(selectedMonth), selectedMonth) + 1);
    return Math.round(totals.expenseCents / days);
  }, [isCurrentMonth, selectedMonth, totals]);

  const savingsRate = useMemo(() => {
    if (!totals || totals.incomeCents <= 0) return null;
    return Math.round((totals.netCents / totals.incomeCents) * 100);
  }, [totals]);

  const currency = summaryQuery.data?.currencyCode ?? bookCurrency;
  const hasActivity = Boolean(totals && (totals.incomeCents !== 0 || totals.expenseCents !== 0));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.colors.app,
        paddingTop: insets.top + tokens.layout.screenPadTop,
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: paddingX, paddingBottom: tabClearance }}
      >
        <ScreenHeader title="Insights" />

        {/* Month selector */}
        <View
          style={{
            marginTop: tokens.space[4],
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <IconButton
            icon="chevron-back"
            size={tokens.layout.minTap}
            accessibilityLabel="Previous month"
            onPress={() => setSelectedMonth((m) => addMonths(m, -1))}
          />
          <AppText variant="base" weight="semibold">
            {monthLabel}
          </AppText>
          <IconButton
            icon="chevron-forward"
            size={tokens.layout.minTap}
            accessibilityLabel="Next month"
            disabled={isCurrentMonth}
            onPress={() => setSelectedMonth((m) => (isCurrentMonth ? m : addMonths(m, 1)))}
          />
        </View>

        {hydrationError ? (
          <View style={{ marginTop: tokens.space[8] }}>
            <EmptyState
              title="Couldn’t load insights"
              message="Retry to refresh transactions and categories."
              actionLabel="Retry"
              tone="danger"
              onAction={retryHydration}
            />
          </View>
        ) : !hydrated || summaryQuery.isPending ? (
          <View style={{ marginTop: tokens.space[7], gap: tokens.space[4] }}>
            <Skeleton height={120} borderRadius={16} />
            <Skeleton height={190} borderRadius={20} />
            <Skeleton height={200} borderRadius={20} />
          </View>
        ) : summaryQuery.isError || !totals ? (
          <View style={{ marginTop: tokens.space[8] }}>
            <EmptyState
              title="Couldn’t load this month’s summary"
              message="Totals stay hidden until they can be verified with the server."
              actionLabel="Retry"
              tone="danger"
              onAction={() => {
                void summaryQuery.refetch();
              }}
            />
          </View>
        ) : !hasActivity ? (
          <View style={{ marginTop: tokens.space[8] }}>
            <EmptyState
              emoji="🌱"
              iconName="stats-chart-outline"
              title="Not enough activity yet"
              message="Add a few transactions to start seeing insights."
              actionLabel="Add transaction"
              onAction={() => router.push("/modals/add-transaction")}
            />
          </View>
        ) : (
          <>
            {/* Net */}
            <View style={{ marginTop: tokens.space[7] }}>
              <AppText variant="xs" tone="muted">
                NET THIS MONTH
              </AppText>
              <MoneyAmount
                value={formatCurrency(totals.netCents, currency)}
                tone="neutral"
                size="amount"
                color={balanceColor(totals.netCents)}
                style={{ marginTop: tokens.space[2] }}
              />

              <View style={{ flexDirection: "row", marginTop: tokens.space[6], gap: tokens.space[4] }}>
                <StatBlock label="Income" value={formatCurrency(totals.incomeCents, currency)} tone="income" />
                <StatBlock label="Spent" value={formatCurrency(totals.expenseCents, currency)} tone="expense" />
              </View>

              {savingsRate !== null ? (
                <View
                  style={{
                    alignSelf: "flex-start",
                    marginTop: tokens.space[4],
                    paddingHorizontal: tokens.space[3],
                    paddingVertical: 6,
                    borderRadius: tokens.radii.pill,
                    backgroundColor: savingsRate >= 0 ? tokens.colors.greenSoft : tokens.colors.redSoft,
                  }}
                >
                  <AppText
                    variant="xs"
                    style={{ color: savingsRate >= 0 ? tokens.colors.accent : tokens.colors.danger }}
                  >
                    {savingsRate}% SAVINGS RATE
                  </AppText>
                </View>
              ) : null}
            </View>

            {/* Trend */}
            <Card variant="surface" padding={16} style={{ marginTop: tokens.space[7] }}>
              <SectionHeader
                title="Spending trend"
                variant="title"
                action={
                  <AppText variant="sm" tone="muted">
                    last {TREND_MONTHS} months
                  </AppText>
                }
              />
              <View style={{ marginTop: tokens.space[3] }}>
                <TrendChart
                  data={trend}
                  height={180}
                  formatValue={(minor) => formatCurrency(minor, currency, 0)}
                  accessibilityLabel={`Spending over the last ${TREND_MONTHS} months`}
                />
              </View>
            </Card>

            {/* Breakdown */}
            {breakdown.rows.length > 0 ? (
              <Card variant="surface" padding={16} style={{ marginTop: tokens.space[4] }}>
                <SectionHeader title="Where it went" variant="title" />
                <View style={{ marginTop: tokens.space[1] }}>
                  {breakdown.rows.map((row) => (
                    <BreakdownRow
                      key={row.id}
                      name={row.name}
                      icon={row.icon}
                      color={row.color}
                      amount={formatCurrency(row.cents, currency)}
                      share={breakdown.total > 0 ? row.cents / breakdown.total : 0}
                    />
                  ))}
                </View>
              </Card>
            ) : null}

            {/* Bottom stats */}
            <View style={{ marginTop: tokens.space[4], flexDirection: "row", gap: tokens.space[3] }}>
              <Card variant="surface" padding={16} style={{ flex: 1 }}>
                <MoneyAmount
                  value={formatCurrency(dailyAverage ?? 0, currency)}
                  tone="neutral"
                  size="xl"
                />
                <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[1] }}>
                  Daily average
                </AppText>
              </Card>

              {largestExpense ? (
                <Card variant="surface" padding={16} style={{ flex: 1 }}>
                  <MoneyAmount
                    value={formatCurrency(largestExpense.amountMinor, currency)}
                    tone="neutral"
                    size="xl"
                  />
                  <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[1] }}>
                    Largest expense
                  </AppText>
                  <AppText variant="xs" tone="subtle" style={{ marginTop: tokens.space[1] }}>
                    {format(
                      safeDate(largestExpense.occurredOn || largestExpense.occurredAt) ?? new Date(),
                      "MMM d"
                    ).toUpperCase()}
                  </AppText>
                </Card>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
