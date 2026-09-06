import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { addMonths, format, isSameDay, parseISO, startOfMonth, subDays } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { useTransactionsStore, type Transaction } from "@/features/transactions/store";
import { TransactionRow } from "@/shared/ui/components/TransactionRow";
import { useBooksStore } from "@/features/books/store";
import { useCategoriesStore } from "@/features/categories/store";
import { useBookCurrency } from "@/features/books/useBookCurrency";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { AppText } from "@/shared/ui/components/AppText";
import { FilterChip } from "@/shared/ui/components/FilterChip";
import { FormField } from "@/shared/ui/components/FormField";
import { IconButton } from "@/shared/ui/components/IconButton";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { ScreenHeader } from "@/shared/ui/components/ScreenHeader";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { useScreenPaddingX, useTabBarClearance } from "@/shared/ui/components/Screen";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { balanceColor } from "@/shared/ui/theme/money";
import { Icon } from "@/shared/ui/components/Icon";

type RangeKey = "today" | "week" | "month" | "all";

type Row =
  | { type: "header"; id: string; title: string; netMinor: number }
  | { type: "tx"; id: string; tx: Transaction };

function inRange(tx: Transaction, range: RangeKey, month: Date) {
  if (range === "all") return true;

  const dayKey = transactionDayKey(tx);
  if (!dayKey) return false;

  if (range === "today") {
    return dayKey === format(new Date(), "yyyy-MM-dd");
  }

  if (range === "week") {
    const start = format(subDays(new Date(), 6), "yyyy-MM-dd");
    const end = format(new Date(), "yyyy-MM-dd");
    return dayKey >= start && dayKey <= end;
  }

  return dayKey.startsWith(format(month, "yyyy-MM"));
}

function safeDate(iso: string) {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function dayTitle(d: Date) {
  const now = new Date();
  if (isSameDay(d, now)) return "Today";
  if (isSameDay(d, subDays(now, 1))) return "Yesterday";
  return format(d, "MMM d");
}

function transactionDayKey(tx: Transaction) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(tx.occurredOn)) return tx.occurredOn;
  const date = safeDate(tx.occurredAt);
  return date ? format(date, "yyyy-MM-dd") : "";
}

/**
 * Day separator: the label on the left, that day's net on the right.
 *
 * Groups are made with a header, spacing and a divider rather than a rounded
 * container per day - a long history reads as one list instead of a stack of
 * boxes.
 */
function DayHeader({ title, netMinor, currency }: { title: string; netMinor: number; currency: string }) {
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

      {/* The rule carries the day's subtotal out to the right edge, so a group
          reads as one band without needing a container around it. */}
      <View style={{ flex: 1, height: 1, backgroundColor: tokens.colors.divider }} />

      <MoneyAmount
        value={formatCurrency(Math.abs(netMinor), currency, 0)}
        kind={netMinor < 0 ? "EXPENSE" : "INCOME"}
        size="sm"
        weight="semibold"
      />
    </View>
  );
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const paddingX = useScreenPaddingX();
  const tabClearance = useTabBarClearance();

  const transactions = useTransactionsStore((s) => s.transactions);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const categories = useCategoriesStore((s) => s.categories);

  const txPersist = (useTransactionsStore as any).persist;
  const booksPersist = (useBooksStore as any).persist;

  const [txHydrated, setTxHydrated] = useState<boolean>(() => {
    const has = txPersist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });
  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => {
    const has = booksPersist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });
  const [hydrationError, setHydrationError] = useState(false);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

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

    const timeoutId = setTimeout(() => {
      const txReady = txPersist?.hasHydrated ? txPersist.hasHydrated() : true;
      const booksReady = booksPersist?.hasHydrated ? booksPersist.hasHydrated() : true;
      if (!txReady || !booksReady) {
        setHydrationError(true);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      for (const unsub of unsubs) unsub?.();
    };
  }, [booksPersist, txPersist]);

  const retryHydration = () => {
    setHydrationError(false);
    setTxHydrated(txPersist?.hasHydrated?.() ?? true);
    setBooksHydrated(booksPersist?.hasHydrated?.() ?? true);
    txPersist?.rehydrate?.();
    booksPersist?.rehydrate?.();
  };

  const isHydrated = txHydrated && booksHydrated;

  const currency = useBookCurrency(selectedBookId);

  const [range, setRange] = useState<RangeKey>("today");
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    setCategoryFilter(null);
  }, [selectedBookId]);

  const bookTransactions = useMemo(() => {
    return transactions.filter((t) => t.bookId === selectedBookId);
  }, [transactions, selectedBookId]);

  const bookCategories = useMemo(() => {
    return categories.filter((c) => c.bookId === selectedBookId);
  }, [categories, selectedBookId]);

  const activeCategory = useMemo(() => {
    return categoryFilter ? (bookCategories.find((c) => c.id === categoryFilter) ?? null) : null;
  }, [bookCategories, categoryFilter]);

  const rangeTransactions = useMemo(() => {
    return bookTransactions.filter((tx) => inRange(tx, range, selectedMonth));
  }, [bookTransactions, range, selectedMonth]);

  const categoryTransactions = useMemo(() => {
    if (!categoryFilter) return rangeTransactions;
    return rangeTransactions.filter((tx) => tx.categoryId === categoryFilter);
  }, [rangeTransactions, categoryFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return categoryTransactions.filter((tx) => {
      if (!q) return true;

      const hay = [tx.title ?? "", tx.categoryName ?? "", tx.note ?? "", tx.type ?? ""]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [query, categoryTransactions]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const tx of categoryTransactions) {
      if (tx.type === "INCOME") income += tx.amountMinor;
      else expense += tx.amountMinor;
    }

    return {
      incomeCents: income,
      expenseCents: expense,
      netCents: income - expense,
      count: categoryTransactions.length,
    };
  }, [categoryTransactions]);

  const rows = useMemo<Row[]>(() => {
    const sorted = [...filtered].sort((a, b) => {
      const da = safeDate(a.occurredAt)?.getTime() ?? 0;
      const db = safeDate(b.occurredAt)?.getTime() ?? 0;
      return db - da;
    });

    // Day nets are computed up front so the header can show them without
    // scanning forward while rendering.
    const netByDay = new Map<string, number>();
    for (const tx of sorted) {
      const key = transactionDayKey(tx) || "unknown";
      const delta = tx.type === "INCOME" ? tx.amountMinor : -tx.amountMinor;
      netByDay.set(key, (netByDay.get(key) ?? 0) + delta);
    }

    const out: Row[] = [];
    let lastKey = "";

    for (const tx of sorted) {
      const key = transactionDayKey(tx) || "unknown";
      const d = key === "unknown" ? null : safeDate(key);

      if (key !== lastKey) {
        lastKey = key;
        out.push({
          type: "header",
          id: `h_${key}`,
          title: d ? dayTitle(d) : "Unknown date",
          netMinor: netByDay.get(key) ?? 0,
        });
      }

      out.push({ type: "tx", id: tx.id, tx });
    }

    return out;
  }, [filtered]);

  const summaryLabel =
    range === "today"
      ? "Net today"
      : range === "week"
        ? "Net, last 7 days"
        : range === "month"
          ? `Net, ${format(selectedMonth, "MMMM")}`
          : "Net, loaded activity";

  const emptyTitle = query.trim()
    ? "No matches"
    : bookTransactions.length === 0
      ? "No transactions yet"
      : activeCategory
        ? `No ${activeCategory.name} activity`
        : range === "today"
          ? "Nothing today"
          : range === "week"
            ? "Nothing in the last 7 days"
            : range === "month"
              ? `Nothing in ${format(selectedMonth, "MMMM")}`
              : "No loaded transactions";

  const emptyMessage = query.trim()
    ? "Try a different search or clear the filter."
    : bookTransactions.length === 0
      ? "Your transactions will appear here."
      : activeCategory
        ? `Try a different category, or clear the "${activeCategory.name}" filter.`
        : range === "today"
          ? "No transaction dated today is present in the latest loaded records."
          : range === "week"
            ? "No transaction from the last 7 days is present in the latest loaded records."
            : "Only the latest loaded records are available in this version.";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.colors.app,
        paddingTop: insets.top + tokens.layout.screenPadTop,
      }}
    >
      <View style={{ paddingHorizontal: paddingX }}>
        <ScreenHeader
          title="Activity"
          right={
            <IconButton
              icon={searchOpen ? "close" : "search"}
              accessibilityLabel={searchOpen ? "Close search" : "Search transactions"}
              onPress={() => {
                setSearchOpen((open) => {
                  if (open) setQuery("");
                  return !open;
                });
              }}
            />
          }
        />

        {searchOpen ? (
          <FormField
            value={query}
            onChangeText={setQuery}
            placeholder="Search transactions"
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
            pill
            leftIcon={<Icon name="search" size={tokens.icon.row} color={tokens.colors.muted} />}
            containerStyle={{ marginTop: tokens.space[4] }}
          />
        ) : null}

        {/* Range */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: tokens.space[2], paddingRight: paddingX }}
          style={{ marginTop: tokens.space[4] }}
        >
          <FilterChip label="Today" active={range === "today"} onPress={() => setRange("today")} />
          <FilterChip label="7 days" active={range === "week"} onPress={() => setRange("week")} />
          <FilterChip label="Month" active={range === "month"} onPress={() => setRange("month")} />
          <FilterChip label="Recent" active={range === "all"} onPress={() => setRange("all")} />
        </ScrollView>

        {/* Category */}
        {bookCategories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: tokens.space[2], paddingRight: paddingX }}
            style={{ marginTop: tokens.space[2] }}
          >
            <FilterChip
              label="All categories"
              active={!categoryFilter}
              onPress={() => setCategoryFilter(null)}
            />
            {bookCategories.map((c) => (
              <FilterChip
                key={c.id}
                label={c.name}
                icon={c.icon}
                iconColor={c.color}
                active={categoryFilter === c.id}
                clearable
                onPress={() => setCategoryFilter((cur) => (cur === c.id ? null : c.id))}
              />
            ))}
          </ScrollView>
        ) : null}

        {/* Month stepper, only while browsing a month */}
        {range === "month" ? (
          <View
            style={{
              marginTop: tokens.space[3],
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
              {format(selectedMonth, "MMMM yyyy")}
            </AppText>
            <IconButton
              icon="chevron-forward"
              size={tokens.layout.minTap}
              accessibilityLabel="Next month"
              onPress={() => setSelectedMonth((m) => addMonths(m, 1))}
            />
          </View>
        ) : null}

        {/* Summary. Quiet by design: the list is the subject of this screen. */}
        <View style={{ marginTop: tokens.space[6] }}>
          <AppText variant="xs" tone="muted">
            {summaryLabel.toUpperCase()}
          </AppText>
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              gap: tokens.space[2],
              marginTop: tokens.space[1],
            }}
          >
            <MoneyAmount
              value={formatCurrency(totals.netCents, currency)}
              tone="neutral"
              size="xl"
              color={balanceColor(totals.netCents)}
            />
            <AppText variant="sm" tone="muted">
              · {totals.count} {totals.count === 1 ? "transaction" : "transactions"}
            </AppText>
          </View>
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: paddingX }}>
        {hydrationError ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <EmptyState
              title="Couldn’t load transactions"
              message="Retry to refresh your transaction history."
              actionLabel="Retry"
              tone="danger"
              onAction={retryHydration}
            />
          </View>
        ) : !isHydrated ? (
          <View style={{ gap: tokens.space[3], paddingTop: tokens.space[6] }}>
            <Skeleton height={tokens.layout.listRowHeight} borderRadius={tokens.radii.md} />
            <Skeleton height={tokens.layout.listRowHeight} borderRadius={tokens.radii.md} />
            <Skeleton height={tokens.layout.listRowHeight} borderRadius={tokens.radii.md} />
          </View>
        ) : rows.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <EmptyState
              emoji={bookTransactions.length === 0 ? "\u{1F335}" : undefined}
              iconName="receipt-outline"
              title={emptyTitle}
              message={emptyMessage}
              actionLabel="Add transaction"
              onAction={() => router.push("/modals/add-transaction")}
            />
          </View>
        ) : (
          <FlashList
            data={rows}
            keyExtractor={(r) => r.id}
            renderItem={({ item, index }) => {
              if (item.type === "header") {
                return <DayHeader title={item.title} netMinor={item.netMinor} currency={currency} />;
              }

              // A divider only between two transactions, never under the last
              // row of a day - the next day's header already separates them.
              const next = rows[index + 1];
              const showDivider = next?.type === "tx";

              return (
                // Rows stagger in a few frames apart so a long history settles
                // as a list rather than snapping in as a block. The delay is
                // capped so nothing further down the screen waits on it.
                <Animated.View
                  entering={FadeInDown.duration(tokens.motion.base).delay(
                    Math.min(index, 8) * tokens.motion.listStagger
                  )}
                >
                  <TransactionRow item={item.tx} embedded showDay={false} />
                  {showDivider ? (
                    <View style={{ height: 1, backgroundColor: tokens.colors.divider }} />
                  ) : null}
                </Animated.View>
              );
            }}
            contentContainerStyle={{ paddingBottom: tabClearance }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </View>
  );
}
