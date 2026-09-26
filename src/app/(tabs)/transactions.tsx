import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { useBooksStore } from "@/features/books/store";
import { useCategoriesStore } from "@/features/categories/store";
import { useBookCurrency } from "@/features/books/useBookCurrency";
import { useActivityFilters } from "@/features/transactions/useActivityFilters";
import { useActivityResults } from "@/features/transactions/queries";
import { buildActivityRows, type ActivityRow } from "@/features/transactions/activityRows";
import {
  allDatesWindow,
  dateRangeLabel,
  hasAdvancedNodes,
  isDatePrimarySort,
  type DatePreset,
  type FilterRoot,
} from "@/features/transactions/filterModel";
import { TABLE_MIN_WIDTH, TableHeader, TableRow } from "@/features/transactions/ui/ActivityTable";
import { DrillBreadcrumb } from "@/features/transactions/ui/DrillBreadcrumb";
import { useFilterStore } from "@/features/transactions/filterStore";
import { setActivityScroll } from "@/features/transactions/activityScroll";
import { CustomRangeSheet } from "@/features/transactions/ui/CustomRangeSheet";
import { AdvancedFilterSheet } from "@/features/transactions/ui/AdvancedFilterSheet";
import { DescribeFilterSheet } from "@/features/transactions/ui/DescribeFilterSheet";
import { SortSheet, describeSort } from "@/features/transactions/ui/SortSheet";
import {
  AmountFilterSheet,
  CategoryFilterSheet,
  PaymentFilterSheet,
} from "@/features/transactions/ui/QuickFilterSheets";
import { useDelayedFlag } from "@/shared/ui/utils/useDelayedFlag";
import { useDebouncedText } from "@/features/transactions/ui/useDebouncedText";
import { exportQueryToDevice, ExportCancelledError, MockModeUnsupportedError } from "@/shared/utils/exportFile";
import { useExportToastStore } from "@/shared/ui/state/useExportToastStore";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { TransactionRow } from "@/shared/ui/components/TransactionRow";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { AppText } from "@/shared/ui/components/AppText";
import { FilterChip } from "@/shared/ui/components/FilterChip";
import { FormField } from "@/shared/ui/components/FormField";
import { LinkButton } from "@/shared/ui/components/Button";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { IconButton } from "@/shared/ui/components/IconButton";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { ScreenHeader } from "@/shared/ui/components/ScreenHeader";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { getApiErrorMessage } from "@/shared/api/errors";
import { Container, useLayoutClass, useScreenPaddingX, useTabBarClearance } from "@/shared/ui/components/Screen";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { balanceColor } from "@/shared/ui/theme/money";
import { Icon } from "@/shared/ui/components/Icon";
import {
  addDaysYmd,
  addMonthsYmd,
  endOfMonthYmd,
  formatMonthYmd,
  formatYmd,
  startOfMonthYmd,
  type Ymd,
} from "@/shared/utils/ledgerDate";

/**
 * Day header. The net on the right appears only when the whole day is loaded; while
 * more pages may still add to it, the header shows the label alone rather than a
 * partial sum passed off as the day's total.
 */
function DayHeader({ title, netMinor, currency }: { title: string; netMinor: number | null; currency: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: tokens.space[3],
        paddingTop: tokens.space[6],
        paddingBottom: tokens.space[2],
      }}
    >
      <AppText variant="xs" tone="muted">
        {title.toUpperCase()}
      </AppText>
      <View style={{ flex: 1, height: 1, backgroundColor: tokens.colors.divider }} />
      {netMinor === null ? null : (
        <MoneyAmount
          value={formatCurrency(Math.abs(netMinor), currency, 0)}
          kind={netMinor < 0 ? "EXPENSE" : "INCOME"}
          size="sm"
          weight="semibold"
        />
      )}
    </View>
  );
}

function isWholeMonth(start: Ymd, end: Ymd) {
  return start === startOfMonthYmd(start) && end === endOfMonthYmd(start);
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const paddingX = useScreenPaddingX();
  const tabClearance = useTabBarClearance();

  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const categories = useCategoriesStore((s) => s.categories);
  const currency = useBookCurrency(selectedBookId);
  const showExportSuccess = useExportToastStore((s) => s.showSuccess);
  const showError = useUndoToastStore((s) => s.showError);

  const filters = useActivityFilters();
  const results = useActivityResults(filters.query);
  const { quick, today } = filters;

  const bookCategories = useMemo(
    () =>
      categories
        .filter((c) => c.bookId === selectedBookId && !c.isDisabled)
        .map((c) => ({ id: c.id, name: c.name, type: c.type, icon: c.icon, color: c.color })),
    [categories, selectedBookId]
  );

  // Sheets. Each is owned by exactly one boolean here; nothing below opens one implicitly.
  const [customOpen, setCustomOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [amountOpen, setAmountOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [describeOpen, setDescribeOpen] = useState(false);
  const [aiProposalRoot, setAiProposalRoot] = useState<FilterRoot | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [searchText, setSearchText] = useDebouncedText(quick.description, filters.setDescription);

  // ---- date chips -------------------------------------------------------------
  const date = quick.date;
  const isPreset = (p: DatePreset) => date?.preset === p;
  const monthView = date !== null && isWholeMonth(date.startDate, date.endDate);
  const customActive = date !== null && !isPreset("today") && !isPreset("7d") && !monthView;
  const rangeLabel = date ? dateRangeLabel(date, filters.describeContext) : "All dates";
  const allWindow = useMemo(() => allDatesWindow(today), [today]);

  const setMonth = (start: Ymd) => {
    const isCurrent = start === startOfMonthYmd(today);
    filters.setDate({ startDate: start, endDate: endOfMonthYmd(start), preset: isCurrent ? "month" : undefined });
  };

  // ---- derived UI -------------------------------------------------------------
  const dateChipId = useMemo(() => {
    // The date slot is the top-level occurredOn BETWEEN node; its chip is the range chips' job.
    return filters.root.children.find((c) => c.kind === "condition" && c.field === "occurredOn" && c.operator === "BETWEEN")?.id;
  }, [filters.root]);
  const activeChips = useMemo(() => filters.chips.filter((c) => c.id !== dateChipId), [filters.chips, dateChipId]);

  const filterCount = activeChips.length;
  const hasFilters = filterCount > 0 || date !== null;

  const rows = useMemo<ActivityRow[]>(
    () => buildActivityRows(results.rows, filters.sort, { today, hasMore: Boolean(results.hasNextPage) }),
    [results.rows, filters.sort, today, results.hasNextPage]
  );

  // After Back from a drill-down, return to where the list was. The previous filter's pages are still
  // cached, so a deep offset is usually loaded; if not, the list simply lands as far down as it can.
  const listRef = useRef<{ scrollToOffset: (o: { offset: number; animated: boolean }) => void } | null>(null);
  const pendingScroll = useFilterStore((s) => s.pendingScroll[filters.scope]);
  const clearPendingScroll = useFilterStore((s) => s.clearPendingScroll);

  const onExport = async () => {
    if (isExporting || !filters.query || !selectedBookId) return;
    setIsExporting(true);
    try {
      // The exact applied filter and sort - every matching row, not the visible page.
      const { fileName } = await exportQueryToDevice(selectedBookId, {
        filter: filters.query.filter,
        ...(filters.query.sort.length > 0 ? { sort: filters.query.sort } : {}),
      });
      showExportSuccess(`Saved ${fileName}`);
    } catch (error) {
      if (error instanceof ExportCancelledError) return;
      if (error instanceof MockModeUnsupportedError) showError(error, error.message);
      else showError(error, "Couldn't export these transactions.");
    } finally {
      setIsExporting(false);
    }
  };

  const showRows = results.status === "ready" && (results.rowsCurrent || rows.length > 0);
  const scope = filters.scope;
  useEffect(() => {
    if (pendingScroll === undefined || !showRows || !results.rowsCurrent) return;
    if (rows.length === 0) {
      // Nothing to scroll in (the restored filter matches no rows): drop the request so it can't fire later.
      clearPendingScroll(scope);
      return;
    }
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: pendingScroll, animated: false });
      clearPendingScroll(scope);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingScroll, showRows, results.rowsCurrent, rows.length, scope, clearPendingScroll]);
  const updating = results.isUpdating;
  const totals = results.totals;

  const emptyTitle = filterCount > 0 ? "No matches" : date !== null ? `Nothing in ${rangeLabel}` : "No transactions yet";
  const emptyMessage =
    filterCount > 0
      ? "Try changing or clearing the filters."
      : date !== null
        ? "No transaction falls inside this date range."
        : "Your transactions will appear here.";

  // Tablet and wide web get a sortable table; phones keep the two-line rows and the sort sheet.
  // Both read and write the same applied `filters.sort`.
  const tabular = useLayoutClass() !== "compact";
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.min(windowWidth, tokens.layout.container.wide) - paddingX * 2;
  const scrollsSideways = tabular && contentWidth < TABLE_MIN_WIDTH;
  const categoryColor = useMemo(() => new Map(categories.map((c) => [c.id, c.color])), [categories]);
  const listData = useMemo(() => (showRows ? (tabular ? rows.filter((r) => r.type === "tx") : rows) : []), [showRows, tabular, rows]);
  // FlashList 2.0.2 can throw "index out of bounds, not enough layouts" from a late row measurement when its data
  // shrinks (delete, an edit that stops matching, a refetch trimmed to page one). Seen on the wide/table layout
  // in ~1 of 3 browser runs; remounting the list on any shrink sidesteps it. A shrink already resets pagination to
  // page one, so no scroll position worth keeping is lost.
  const shrink = useRef({ length: 0, epoch: 0 });
  if (tabular && listData.length < shrink.current.length) shrink.current.epoch += 1;
  shrink.current.length = listData.length;

  // A refresh that failed while rows are on screen: keep the rows, say they may be out of date. (A first load
  // or a new filter that fails has no rows to keep and becomes the error state below.)
  const staleError = results.status === "ready" && Boolean(results.error);
  // A hung request (bad network) otherwise looks identical to a fast one for the full 15s axios timeout.
  const slow = useDelayedFlag(updating, 4000);

  // The type quick-chip already shows Expenses/Income as selected; repeating it here (in another
  // colour) only made the filter area taller.
  const appliedChips = activeChips.filter((c) => c.label !== "Expenses" && c.label !== "Income");

  const listState =
    results.status === "error" ? (
      <EmptyState
        title="Couldn’t load transactions"
        message={getApiErrorMessage(results.error, "Check your connection and try again.")}
        actionLabel="Retry"
        tone="danger"
        onAction={() => void results.refetch()}
      />
    ) : !showRows ? (
      <View style={{ gap: tokens.space[3], paddingTop: tokens.space[4] }}>
        <Skeleton height={tokens.layout.listRowHeight} />
        <Skeleton height={tokens.layout.listRowHeight} />
        <Skeleton height={tokens.layout.listRowHeight} />
      </View>
    ) : (
      <EmptyState
        emoji={!hasFilters ? "\u{1F335}" : undefined}
        iconName="receipt-outline"
        title={emptyTitle}
        message={emptyMessage}
        actionLabel={filterCount > 0 ? "Clear filters" : date !== null ? "Show all dates" : "Add transaction"}
        onAction={
          filterCount > 0
            ? filters.clearAll
            : date !== null
              ? () => filters.setDate(null)
              : () => router.push("/modals/add-transaction")
        }
      />
    );

  // Everything between the chips and the first row. It scrolls with the list, so the rows get the
  // screen: on a 844px phone the fixed header used to be ~60% of the height once filtered.
  const listHeader = (
    <View>
      {staleError ? (
        <View
          accessibilityRole="alert"
          style={{ marginTop: tokens.space[3], padding: tokens.space[3], borderRadius: tokens.radii.md, backgroundColor: tokens.colors.amberSoft }}
        >
          <AppText variant="sm" weight="semibold">
            Showing saved results
          </AppText>
          <AppText variant="caption" tone="muted">
            {getApiErrorMessage(results.error, "Couldn’t refresh.")}
          </AppText>
          <LinkButton label="Retry" onPress={() => void results.refetch()} />
        </View>
      ) : null}

      {/* Applied filters, removable one by one. */}
      {appliedChips.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: tokens.space[2], alignItems: "center" }}
          style={{ marginTop: tokens.space[3], flexGrow: 0 }}
        >
          {appliedChips.map((chip) => (
            <FilterChip key={chip.id} label={chip.label} active clearable onPress={() => filters.removeChip(chip.id)} />
          ))}
        </ScrollView>
      ) : null}

      {/* Month stepper, only while browsing a calendar month */}
      {monthView && date ? (
        <View style={{ marginTop: tokens.space[3], flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <IconButton
            icon="chevron-back"
            size={tokens.layout.minTap}
            accessibilityLabel="Previous month"
            onPress={() => setMonth(addMonthsYmd(date.startDate, -1))}
          />
          <AppText variant="base" weight="semibold">
            {formatMonthYmd(date.startDate)}
          </AppText>
          <IconButton
            icon="chevron-forward"
            size={tokens.layout.minTap}
            accessibilityLabel="Next month"
            onPress={() => setMonth(addMonthsYmd(date.startDate, 1))}
          />
        </View>
      ) : null}

      {/* Totals over EVERY matching transaction (server-side), never the loaded rows. While the
          applied filter is changing they are dimmed, not swapped for stale or zero figures. */}
      <View style={{ marginTop: tokens.space[5] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[2] }}>
          <AppText variant="xs" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
            {rangeLabel.toUpperCase()}
            {filterCount > 0 ? ` · ${filterCount} ${filterCount === 1 ? "FILTER" : "FILTERS"}` : ""}
          </AppText>
          {updating ? (
            <AppText variant="xs" tone="muted" accessibilityLiveRegion="polite">
              {slow ? "SLOW CONNECTION…" : "UPDATING…"}
            </AppText>
          ) : null}
          {filterCount > 0 ? <LinkButton label="Clear all" accessibilityLabel="Clear all filters" tone="muted" onPress={filters.clearAll} /> : null}
        </View>
        {date === null ? (
          <AppText variant="caption" tone="subtle">
            {formatYmd(allWindow.startDate)} – {formatYmd(allWindow.endDate)}
          </AppText>
        ) : null}

        {totals ? (
          <View style={{ opacity: updating ? 0.6 : 1 }}>
            <View style={{ flexDirection: "row", marginTop: tokens.space[2], gap: tokens.space[4], maxWidth: 560 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="sm" tone="muted">
                  Spent
                </AppText>
                <MoneyAmount value={formatCurrency(totals.expenseTotalMinor, currency)} kind="EXPENSE" size="lg" style={{ marginTop: 2 }} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="sm" tone="muted">
                  Received
                </AppText>
                <MoneyAmount value={formatCurrency(totals.incomeTotalMinor, currency)} kind="INCOME" size="lg" style={{ marginTop: 2 }} />
              </View>
            </View>

            <View style={{ marginTop: tokens.space[3] }}>
              <AppText variant="sm" tone="muted">
                Net · {totals.matchedCount} {totals.matchedCount === 1 ? "transaction" : "transactions"}
              </AppText>
              <MoneyAmount
                value={formatCurrency(totals.netMinor, currency)}
                tone="neutral"
                size="xl"
                color={balanceColor(totals.netMinor)}
                style={{ marginTop: 2 }}
              />
            </View>
          </View>
        ) : results.status === "error" ? null : results.totalsError ? (
          <View style={{ marginTop: tokens.space[3] }}>
            <AppText variant="sm" tone="danger">
              Couldn’t load totals.
            </AppText>
            <LinkButton label="Retry" onPress={() => void results.refetch()} />
          </View>
        ) : (
          <View style={{ marginTop: tokens.space[3], gap: tokens.space[3] }}>
            <Skeleton height={44} />
            <Skeleton height={48} />
          </View>
        )}

        {filters.sort.length > 0 && !isDatePrimarySort(filters.sort) ? (
          <AppText variant="caption" tone="subtle" style={{ marginTop: tokens.space[3] }}>
            Sorted by {describeSort(filters.sort)}
          </AppText>
        ) : null}
        {results.totalCount > 0 ? (
          <AppText variant="caption" tone="subtle" style={{ marginTop: tokens.space[2] }}>
            Showing {results.rows.length} of {results.totalCount}
          </AppText>
        ) : null}
      </View>
    </View>
  );

  const list = (
    <FlashList
      ref={listRef as never}
      onScroll={(e) => setActivityScroll(scope, e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={64}
      key={`${filters.scope}:${tabular ? `table${shrink.current.epoch}` : "rows"}`}
      data={listData}
      keyExtractor={(r) => r.id}
      getItemType={(r) => r.type}
      renderItem={({ item }) =>
        item.type === "header" ? (
          <DayHeader title={item.title} netMinor={item.netMinor} currency={currency} />
        ) : tabular ? (
          // The divider must not depend on the list length: a row whose border toggled when it stopped (or started)
          // being last changed height on every page append/delete, which made FlashList throw "index out of
          // bounds, not enough layouts" on wide layouts.
          <TableRow tx={item.tx} currency={currency} categoryColor={categoryColor.get(item.tx.categoryId)} divider />
        ) : (
          <View>
            <TransactionRow item={item.tx} embedded showDay={!isDatePrimarySort(filters.sort)} />
            {item.divider ? <View style={{ height: 1, backgroundColor: tokens.colors.divider }} /> : null}
          </View>
        )
      }
      onEndReached={() => {
        if (results.hasNextPage && !results.isFetchingNextPage) void results.fetchNextPage();
      }}
      onEndReachedThreshold={0.6}
      // Tabular layouts pin the summary above the column headers instead, so the headers sit on the rows.
      ListHeaderComponent={tabular ? null : listHeader}
      ListEmptyComponent={listState}
      ListFooterComponent={
        results.isFetchingNextPage ? (
          <View style={{ paddingTop: tokens.space[3] }}>
            <Skeleton height={tokens.layout.listRowHeight} />
          </View>
        ) : showRows && !results.hasNextPage && results.rows.length < results.totalCount ? (
          <AppText variant="sm" tone="muted" style={{ paddingVertical: tokens.space[4] }}>
            Only the first {results.rows.length.toLocaleString()} matches can be listed. Narrow the filters or change the sort to see the rest.
          </AppText>
        ) : null
      }
      contentContainerStyle={{ paddingBottom: tabClearance }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshing={results.isUpdating && results.rowsCurrent}
      onRefresh={() => void results.refetch()}
    />
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.colors.app,
        paddingTop: insets.top + tokens.layout.screenPadTop,
      }}
    >
      <Container width="wide" style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: paddingX }}>
          <ScreenHeader
            title="Activity"
            right={
              <View style={{ flexDirection: "row", gap: tokens.space[2] }}>
                <IconButton
                  icon="download-outline"
                  accessibilityLabel="Export current results"
                  disabled={isExporting || results.totalCount === 0}
                  onPress={onExport}
                />
                <IconButton icon="swap-vertical" accessibilityLabel="Sort" onPress={() => setSortOpen(true)} />
                <IconButton
                  icon={searchOpen ? "close" : "search"}
                  accessibilityLabel={searchOpen ? "Close search" : "Search transactions"}
                  onPress={() => {
                    if (searchOpen) setSearchText("");
                    setSearchOpen((open) => !open);
                  }}
                />
              </View>
            }
          />

          <DrillBreadcrumb scope={filters.scope} />

          {searchOpen ? (
            <FormField
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search title or note"
              accessibilityLabel="Search transactions"
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus
              returnKeyType="search"
              pill
              leftIcon={<Icon name="search" size={tokens.icon.row} color={tokens.colors.muted} />}
              containerStyle={{ marginTop: tokens.space[3] }}
            />
          ) : null}

          {/* Date range */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: tokens.space[2], paddingRight: paddingX }}
            style={{ marginTop: tokens.space[3], flexGrow: 0 }}
          >
            <FilterChip label="Today" active={isPreset("today")} onPress={() => filters.setDate({ startDate: today, endDate: today, preset: "today" })} />
            <FilterChip label="7 days" active={isPreset("7d")} onPress={() => filters.setDate({ startDate: shiftDays(today, -6), endDate: today, preset: "7d" })} />
            <FilterChip label="Month" active={monthView} onPress={() => setMonth(startOfMonthYmd(today))} />
            <FilterChip label="All" active={date === null} onPress={() => filters.setDate(null)} />
            <FilterChip label={customActive ? rangeLabel : "Custom"} icon="calendar-outline" active={customActive} onPress={() => setCustomOpen(true)} />
          </ScrollView>

          {/* Quick filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: tokens.space[2], paddingRight: paddingX }}
            style={{ marginTop: tokens.space[2], flexGrow: 0 }}
          >
            <FilterChip label="Expenses" tone="expense" active={quick.type === "EXPENSE"} clearable onPress={() => filters.setType(quick.type === "EXPENSE" ? null : "EXPENSE")} />
            <FilterChip label="Income" tone="income" active={quick.type === "INCOME"} clearable onPress={() => filters.setType(quick.type === "INCOME" ? null : "INCOME")} />
            <FilterChip
              label={quick.categoryIds.length > 0 ? `Categories · ${quick.categoryIds.length}` : "Categories"}
              active={quick.categoryIds.length > 0}
              onPress={() => setCategoryOpen(true)}
            />
            <FilterChip label="Amount" active={quick.amountMinMinor !== null || quick.amountMaxMinor !== null} onPress={() => setAmountOpen(true)} />
            <FilterChip label="Payment" active={quick.paymentMethods.length > 0 || quick.paymentUnspecified} onPress={() => setPaymentOpen(true)} />
            <FilterChip label="Advanced" icon="settings-outline" active={hasAdvancedNodes(filters.root)} onPress={() => setAdvancedOpen(true)} />
            <FilterChip label="Describe your filter" icon="sparkles-outline" active={false} onPress={() => setDescribeOpen(true)} />
          </ScrollView>
        </View>

        <View style={{ flex: 1, paddingHorizontal: paddingX }}>
          {tabular ? (
            scrollsSideways ? (
              // Genuinely wide content: the table keeps its columns and scrolls sideways.
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ width: TABLE_MIN_WIDTH }}>
                <View style={{ flex: 1 }}>
                  {listHeader}
                  {showRows && listData.length > 0 ? <TableHeader sort={filters.sort} onSort={filters.setSort} /> : null}
                  {list}
                </View>
              </ScrollView>
            ) : (
              <View style={{ flex: 1 }}>
                {listHeader}
                {showRows && listData.length > 0 ? <TableHeader sort={filters.sort} onSort={filters.setSort} /> : null}
                {list}
              </View>
            )
          ) : (
            <View style={{ flex: 1, opacity: updating && !results.rowsCurrent ? 0.5 : 1 }}>{list}</View>
          )}
        </View>

        <CustomRangeSheet
          visible={customOpen}
          onClose={() => setCustomOpen(false)}
          initial={date ? { startDate: date.startDate, endDate: date.endDate } : { startDate: shiftDays(today, -6), endDate: today }}
          onApply={(range) => filters.setDate(range)}
          onReset={filters.reset}
        />

        <CategoryFilterSheet
          visible={categoryOpen}
          onClose={() => setCategoryOpen(false)}
          options={bookCategories}
          selected={quick.categoryIds}
          onChange={filters.setCategories}
        />

        <AmountFilterSheet
          visible={amountOpen}
          onClose={() => setAmountOpen(false)}
          currency={currency}
          min={quick.amountMinMinor}
          max={quick.amountMaxMinor}
          onChange={filters.setAmount}
        />

        <PaymentFilterSheet
          visible={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          methods={quick.paymentMethods}
          unspecified={quick.paymentUnspecified}
          onChange={filters.setPayment}
        />

        <AdvancedFilterSheet
          visible={advancedOpen}
          onClose={() => {
            setAdvancedOpen(false);
            setAiProposalRoot(null);
          }}
          scope={filters.scope}
          model={filters.modelContext}
          describeContext={filters.describeContext}
          categories={bookCategories}
          initialRoot={aiProposalRoot}
        />

        <DescribeFilterSheet
          visible={describeOpen}
          onClose={() => setDescribeOpen(false)}
          bookId={selectedBookId}
          onProposal={(root, sort) => {
            setAiProposalRoot(root);
            if (sort.length > 0) filters.setSort(sort);
            setDescribeOpen(false);
            setAdvancedOpen(true);
          }}
        />

        <SortSheet visible={sortOpen} onClose={() => setSortOpen(false)} scope={filters.scope} />
    </Container>
    </View>
  );
}

function shiftDays(ymd: Ymd, days: number): Ymd {
  return addDaysYmd(ymd, days);
}
