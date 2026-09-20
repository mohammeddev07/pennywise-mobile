import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { useCategoriesStore } from "@/features/categories/store";
import { useBooksStore } from "@/features/books/store";
import { useBookCurrency } from "@/features/books/useBookCurrency";
import { mapTransactionResponse } from "@/features/transactions/model";
import { useAnalysis } from "@/features/transactions/queries";
import { useActivityFilters } from "@/features/transactions/useActivityFilters";
import { useFilterStore } from "@/features/transactions/filterStore";
import { getActivityScroll } from "@/features/transactions/activityScroll";
import { buildQuery, drillRoot, setQuickDate } from "@/features/transactions/filterModel";
import {
  categoryRows,
  insightsWindow,
  series,
  type InsightsBucket,
} from "@/features/transactions/insights";
import { DrillBreadcrumb } from "@/features/transactions/ui/DrillBreadcrumb";
import type { CategoryTotal, TransactionType } from "@/shared/types/transactionQuery";
import { AppText } from "@/shared/ui/components/AppText";
import { BreakdownRow } from "@/shared/ui/components/BreakdownRow";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { FilterChip } from "@/shared/ui/components/FilterChip";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { ScreenHeader } from "@/shared/ui/components/ScreenHeader";
import { SectionHeader } from "@/shared/ui/components/SectionHeader";
import { SegmentedControl } from "@/shared/ui/components/SegmentedControl";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { StatBlock } from "@/shared/ui/components/StatBlock";
import { TrendChart, type TrendPoint } from "@/shared/ui/components/TrendChart";
import { useScreenPaddingX, useTabBarClearance } from "@/shared/ui/components/Screen";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { formatYmd } from "@/shared/utils/ledgerDate";
import { balanceColor } from "@/shared/ui/theme/money";

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paddingX = useScreenPaddingX();
  const tabClearance = useTabBarClearance();

  const categories = useCategoriesStore((s) => s.categories);
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

  const filters = useActivityFilters();
  const showError = useUndoToastStore((s) => s.showError);
  const bookCurrency = useBookCurrency(selectedBookId);

  const [bucket, setBucket] = useState<InsightsBucket>("MONTH");
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [bucketKey, setBucketKey] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  // One request: the shared applied filter (minus Activity's date, which Insights replaces with its
  // own explicit window) over that window, bucketed. No per-month fan-out, no client-side aggregation.
  const span = useMemo(() => insightsWindow(bucket, filters.today), [bucket, filters.today]);
  const query = useMemo(
    () => (filters.ready && filters.revision > 0 ? buildQuery(setQuickDate(filters.root, span), [], filters.today) : null),
    [filters.ready, filters.revision, filters.root, span, filters.today]
  );
  const analysisQuery = useAnalysis(query, bucket);
  // Never present the previous filter's or window's numbers as the current answer.
  const analysis = analysisQuery.isPlaceholderData ? null : (analysisQuery.data ?? null);
  const updating = analysisQuery.isPlaceholderData || (analysisQuery.isFetching && !analysisQuery.isPending);

  const currency = analysis?.currencyCode ?? bookCurrency;
  const money = (minor: number, digits?: number) => formatCurrency(minor, currency, digits);

  const rows = useMemo(() => (analysis ? categoryRows(analysis, type) : []), [analysis, type]);
  const selectedCategory = rows.find((r) => r.categoryId === categoryId) ?? null;
  const points = useMemo(() => (analysis ? series(analysis, type, selectedCategory?.categoryId ?? null) : []), [analysis, type, selectedCategory]);
  const selectedIndex = bucketKey ? points.findIndex((p) => p.key === bucketKey) : -1;
  const selectedPoint = selectedIndex >= 0 ? points[selectedIndex] : null;

  const chartData = useMemo<TrendPoint[]>(
    () =>
      points.map((p) => ({
        label: p.label,
        value: p.valueMinor,
        partial: p.partial,
        caption: `${p.longLabel} · ${p.count} ${p.count === 1 ? "transaction" : "transactions"}${p.partial ? " · partial period" : ""}`,
      })),
    [points]
  );
  const anyPartial = points.some((p) => p.partial);

  const categoryMeta = useMemo(() => {
    const map = new Map<string, { icon?: string; color?: string }>();
    for (const c of categories) map.set(c.id, { icon: c.icon, color: c.color });
    return map;
  }, [categories]);

  const dateChipId = filters.root.children.find((c) => c.kind === "condition" && c.field === "occurredOn" && c.operator === "BETWEEN")?.id;
  const sharedChips = filters.chips.filter((c) => c.id !== dateChipId);

  const total = analysis ? (type === "EXPENSE" ? analysis.expenseTotalMinor : analysis.incomeTotalMinor) : 0;
  const largestExpense = analysis?.largestExpense ? mapTransactionResponse(analysis.largestExpense) : null;
  const windowText = `${formatYmd(span.startDate)} – ${formatYmd(span.endDate)}`;

  const changeBucket = (next: InsightsBucket) => {
    setBucket(next);
    setBucketKey(null);
  };
  const changeType = (next: TransactionType) => {
    setType(next);
    setCategoryId(null);
    setBucketKey(null);
  };

  /**
   * Opens Activity on AND(shared filter, this window or bucket, category, type): the same rows the
   * figure was counted from. Activity shows a Back action to the filter that was applied before.
   */
  const drill = (category: CategoryTotal | null, point: { start: string; end: string; longLabel: string } | null) => {
    if (!analysis) return;
    const next = drillRoot(filters.root, {
      window: point ? { startDate: point.start, endDate: point.end } : analysis.window,
      categoryId: category?.categoryId ?? null,
      type,
    });
    if (!next) {
      showError(new Error("filter too deep"), "This filter is too nested to drill into. Simplify it in Activity first.");
      return;
    }
    const label = [category?.categoryName ?? (type === "EXPENSE" ? "All spending" : "All income"), point?.longLabel ?? windowText].join(" · ");
    useFilterStore.getState().drillInto(filters.scope, next, label, getActivityScroll(filters.scope));
    router.push("/(tabs)/transactions");
  };

  const hasActivity = Boolean(analysis && analysis.matchedCount > 0);
  const filtered = sharedChips.length > 0;

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
        <DrillBreadcrumb scope={filters.scope} />

        <View style={{ marginTop: tokens.space[4], gap: tokens.space[3] }}>
          <SegmentedControl
            items={[
              { label: "Months", value: "MONTH" },
              { label: "Years", value: "YEAR" },
            ]}
            value={bucket}
            onChange={changeBucket}
          />
          <SegmentedControl
            items={[
              { label: "Spending", value: "EXPENSE", color: tokens.colors.danger },
              { label: "Income", value: "INCOME", color: tokens.colors.income },
            ]}
            value={type}
            onChange={changeType}
            haptic="impactMedium"
          />
        </View>

        <AppText variant="xs" tone="muted" style={{ marginTop: tokens.space[3] }}>
          {windowText} · {bucket === "MONTH" ? "monthly" : "yearly"} · {currency}
        </AppText>

        {filtered ? (
          <View style={{ marginTop: tokens.space[2] }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: tokens.space[2] }}>
              {sharedChips.map((chip) => (
                <FilterChip key={chip.id} label={chip.label} active clearable onPress={() => filters.removeChip(chip.id)} />
              ))}
            </ScrollView>
            <AppText variant="xs" tone="subtle" style={{ marginTop: tokens.space[1] }}>
              Filters are shared with Activity. Insights uses its own date window above.
            </AppText>
          </View>
        ) : null}

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
        ) : !hydrated || !analysis ? (
          analysisQuery.isError && !analysisQuery.data ? (
            <View style={{ marginTop: tokens.space[8] }}>
              <EmptyState
                title="Couldn’t load insights"
                message="Totals stay hidden until they can be verified with the server."
                actionLabel="Retry"
                tone="danger"
                onAction={() => {
                  void analysisQuery.refetch();
                }}
              />
            </View>
          ) : (
            <View style={{ marginTop: tokens.space[7], gap: tokens.space[4] }}>
              <Skeleton height={120} borderRadius={16} />
              <Skeleton height={190} borderRadius={20} />
              <Skeleton height={200} borderRadius={20} />
            </View>
          )
        ) : !hasActivity ? (
          <View style={{ marginTop: tokens.space[8] }}>
            <EmptyState
              emoji="🌱"
              iconName="stats-chart-outline"
              title={filtered ? "No matching transactions" : "Not enough activity yet"}
              message={
                filtered
                  ? `Nothing in ${windowText} matches the shared filters. Nothing is estimated - clear a filter or widen the window.`
                  : `No transactions fall inside ${windowText}.`
              }
              actionLabel={filtered ? "Clear filters" : "Add transaction"}
              onAction={filtered ? filters.clearAll : () => router.push("/modals/add-transaction")}
            />
          </View>
        ) : (
          <>
            {/* Totals over the whole window and filter */}
            <View style={{ marginTop: tokens.space[6], opacity: updating ? 0.6 : 1 }}>
              <AppText variant="xs" tone="muted">
                NET · {analysis.matchedCount} {analysis.matchedCount === 1 ? "TRANSACTION" : "TRANSACTIONS"}
                {updating ? " · UPDATING…" : ""}
              </AppText>
              <MoneyAmount
                value={money(analysis.netMinor)}
                tone="neutral"
                size="amount"
                color={balanceColor(analysis.netMinor)}
                style={{ marginTop: tokens.space[2] }}
              />
              <View style={{ flexDirection: "row", marginTop: tokens.space[5], gap: tokens.space[4] }}>
                <StatBlock label="Income" value={money(analysis.incomeTotalMinor)} tone="income" />
                <StatBlock label="Spent" value={money(analysis.expenseTotalMinor)} tone="expense" />
              </View>
            </View>

            {/* Trend */}
            <Card variant="surface" padding={16} style={{ marginTop: tokens.space[6], opacity: updating ? 0.6 : 1 }}>
              <SectionHeader
                title={`${type === "EXPENSE" ? "Spending" : "Income"} by ${bucket === "MONTH" ? "month" : "year"}`}
                variant="title"
                action={
                  <AppText variant="sm" tone="muted" numberOfLines={1}>
                    {selectedCategory?.categoryName ?? "All categories"}
                  </AppText>
                }
              />
              <View style={{ marginTop: tokens.space[3] }}>
                <TrendChart
                  data={chartData}
                  height={180}
                  formatValue={(minor) => money(minor, 2)}
                  selectedIndex={selectedIndex >= 0 ? selectedIndex : null}
                  onSelect={(i) => setBucketKey(i === null ? null : (points[i]?.key ?? null))}
                  accessibilityLabel={`${type === "EXPENSE" ? "Spending" : "Income"} by ${bucket === "MONTH" ? "month" : "year"} in ${currency}`}
                />
              </View>
              <AppText variant="xs" tone="subtle" style={{ marginTop: tokens.space[2] }}>
                Bars start at 0 · {currency}
                {anyPartial ? " · * partial period" : ""}
              </AppText>

              {selectedPoint ? (
                <View style={{ marginTop: tokens.space[3] }}>
                  <AppText variant="sm" weight="semibold">
                    {selectedPoint.longLabel}
                    {selectedPoint.partial ? ` (partial: ${formatYmd(selectedPoint.start)} – ${formatYmd(selectedPoint.end)})` : ""}
                  </AppText>
                  <AppText variant="sm" tone="muted">
                    {money(selectedPoint.valueMinor)} · {selectedPoint.count} {selectedPoint.count === 1 ? "transaction" : "transactions"}
                  </AppText>
                  {selectedPoint.count > 0 ? (
                    <HapticPressable
                      onPress={() => drill(selectedCategory, selectedPoint)}
                      haptic="none"
                      accessibilityRole="button"
                      style={{ minHeight: tokens.layout.minTap, justifyContent: "center" }}
                    >
                      <AppText variant="sm" weight="semibold" style={{ color: tokens.colors.accent }}>
                        View {selectedPoint.count} in Activity
                      </AppText>
                    </HapticPressable>
                  ) : (
                    <AppText variant="sm" tone="subtle">
                      Nothing in this period.
                    </AppText>
                  )}
                </View>
              ) : (
                <AppText variant="xs" tone="subtle" style={{ marginTop: tokens.space[2] }}>
                  Tap a bar for its exact amount and transactions.
                </AppText>
              )}

              <HapticPressable
                onPress={() => setShowTable((v) => !v)}
                haptic="none"
                accessibilityRole="button"
                accessibilityState={{ expanded: showTable }}
                style={{ minHeight: tokens.layout.minTap, justifyContent: "center" }}
              >
                <AppText variant="sm" tone="muted" weight="semibold">
                  {showTable ? "Hide table" : "Show as table"}
                </AppText>
              </HapticPressable>
              {showTable ? (
                <View accessibilityRole="summary">
                  {analysis.buckets.map((b) => {
                    const point = points.find((p) => p.key === b.key)!;
                    return (
                      <View
                        key={b.key}
                        style={{ flexDirection: "row", gap: tokens.space[2], paddingVertical: tokens.space[1] }}
                        accessibilityLabel={`${point.longLabel}${b.partial ? " partial" : ""}: income ${money(b.incomeTotalMinor)}, spent ${money(b.expenseTotalMinor)}, net ${money(b.netMinor)}, ${b.count} transactions`}
                      >
                        <AppText variant="xs" style={{ width: 64 }}>
                          {point.longLabel}
                          {b.partial ? "*" : ""}
                        </AppText>
                        <AppText variant="xs" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
                          {money(b.expenseTotalMinor)} spent
                        </AppText>
                        <AppText variant="xs" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
                          {money(b.incomeTotalMinor)} in
                        </AppText>
                        <AppText variant="xs" tone="subtle" style={{ width: 28, textAlign: "right" }}>
                          {b.count}
                        </AppText>
                      </View>
                    );
                  })}
                  <AppText variant="xs" tone="subtle" style={{ marginTop: tokens.space[1] }}>
                    Columns: period, spent, income, transactions. Values in {currency}.
                  </AppText>
                </View>
              ) : null}
            </Card>

            {/* Every category, biggest first. Selecting one plots it; its own action opens the rows. */}
            <Card variant="surface" padding={16} style={{ marginTop: tokens.space[4], opacity: updating ? 0.6 : 1 }}>
              <SectionHeader
                title={type === "EXPENSE" ? "Where it went" : "Where it came from"}
                variant="title"
                action={
                  <AppText variant="sm" tone="muted">
                    {money(total)}
                  </AppText>
                }
              />
              {rows.length === 0 ? (
                <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[3] }}>
                  {type === "EXPENSE" ? "No spending" : "No income"} in this window{filtered ? " with these filters" : ""}.
                </AppText>
              ) : (
                <View style={{ marginTop: tokens.space[1] }}>
                  {rows.map((row) => {
                    const meta = categoryMeta.get(row.categoryId);
                    const selected = row.categoryId === selectedCategory?.categoryId;
                    return (
                      <BreakdownRow
                        key={`${row.categoryId}|${row.type}`}
                        name={row.categoryName}
                        icon={meta?.icon}
                        color={meta?.color ?? tokens.colors.accent}
                        amount={money(row.totalMinor)}
                        count={row.count}
                        share={row.percentOfExpense === null ? null : row.percentOfExpense / 100}
                        shareLabel="of filtered spending"
                        selected={selected}
                        onPress={() => setCategoryId(selected ? null : row.categoryId)}
                        footer={
                          selected ? (
                            <HapticPressable
                              onPress={() => drill(row, null)}
                              haptic="none"
                              accessibilityRole="button"
                              style={{ minHeight: tokens.layout.minTap, justifyContent: "center" }}
                            >
                              <AppText variant="sm" weight="semibold" style={{ color: tokens.colors.accent }}>
                                View {row.count} in Activity
                              </AppText>
                            </HapticPressable>
                          ) : null
                        }
                      />
                    );
                  })}
                </View>
              )}
            </Card>

            {largestExpense ? (
              <HapticPressable
                haptic="none"
                accessibilityRole="button"
                accessibilityLabel={`Largest expense ${money(largestExpense.amountMinor)}. Open details`}
                onPress={() =>
                  router.push({
                    pathname: "/modals/transaction-details",
                    params: { id: largestExpense.id, bookId: largestExpense.bookId },
                  })
                }
                style={{ marginTop: tokens.space[4] }}
              >
                <Card variant="surface" padding={16}>
                  <MoneyAmount value={money(largestExpense.amountMinor)} tone="neutral" size="xl" />
                  <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[1] }}>
                    Largest expense · {largestExpense.title || "Untitled"}
                  </AppText>
                  <AppText variant="xs" tone="subtle" style={{ marginTop: tokens.space[1] }}>
                    {formatYmd(largestExpense.occurredOn)}
                  </AppText>
                </Card>
              </HapticPressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
