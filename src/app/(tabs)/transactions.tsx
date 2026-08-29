import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { addMonths, format, isSameDay, parseISO, startOfMonth, subDays } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { useTransactionsStore, type Transaction } from "@/features/transactions/store";
import { TransactionRow } from "@/shared/ui/components/TransactionRow";
import { useBooksStore } from "@/features/books/store";
import { useCategoriesStore } from "@/features/categories/store";
import { useBookCurrency } from "@/features/books/useBookCurrency";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { AppText } from "@/shared/ui/components/AppText";
import { Input } from "@/shared/ui/components/Input";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { Card } from "@/shared/ui/components/Card";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { balanceColor } from "@/shared/ui/theme/money";
import { SummaryStat } from "@/shared/ui/components/SummaryStat";

type RangeKey = "today" | "week" | "month" | "all";

type Row =
  | { type: "header"; id: string; title: string }
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

function RangeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <HapticPressable
      onPress={onPress}
      haptic="selection"
      pressScale={0.985}
      className="rounded-full border px-4 min-h-11 items-center justify-center"
      android_ripple={{ color: "#0B122012" }}
      style={{
        borderColor: active ? tokens.colors.greenSoft : tokens.colors.stroke,
        backgroundColor: active ? tokens.colors.greenSoft : tokens.colors.surface,
      }}
    >
      <AppText variant="sm" weight="semibold" style={{ color: active ? tokens.colors.accent : tokens.colors.text }}>
        {label}
      </AppText>
    </HapticPressable>
  );
}

function CategoryChip({
  label,
  icon,
  color,
  active,
  onPress,
}: {
  label: string;
  icon?: string;
  color?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <HapticPressable
      onPress={onPress}
      haptic="selection"
      pressScale={0.985}
      className="mr-2 h-11 px-4 rounded-full border flex-row items-center"
      android_ripple={{ color: "#0B122012", borderless: true }}
      style={{
        borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
        backgroundColor: active ? `${tokens.colors.accent}14` : tokens.colors.surface,
      }}
    >
      {icon ? (
        <View
          className="h-6 w-6 items-center justify-center rounded-full border border-stroke mr-2"
          style={{ backgroundColor: `${color ?? tokens.colors.muted}22` }}
        >
          <Ionicons name={icon as any} size={12} color={color ?? tokens.colors.muted} />
        </View>
      ) : null}

      <AppText variant="sm" weight="semibold" style={{ color: active ? tokens.colors.accent : tokens.colors.text }}>
        {label}
      </AppText>

      {active ? (
        <Ionicons name="close" size={14} color={tokens.colors.accent} style={{ marginLeft: 6 }} />
      ) : null}
    </HapticPressable>
  );
}

function IconButton({ icon, onPress, disabled }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }) {
  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      pressScale={0.98}
      className="h-11 w-11 items-center justify-center rounded-full border border-stroke bg-surface"
      android_ripple={{ color: "#0B122012", borderless: true }}
    >
      <Ionicons name={icon} size={18} color={disabled ? tokens.colors.muted : tokens.colors.text} />
    </HapticPressable>
  );
}


function SectionHeader({ title }: { title: string }) {
  return (
    <View className="pt-4 pb-2">
      <AppText variant="xs" tone="muted" className="uppercase">
        {title}
      </AppText>
    </View>
  );
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();

  const transactions = useTransactionsStore((s) => s.transactions);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const books = useBooksStore((s) => s.books);
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
    return categoryFilter ? bookCategories.find((c) => c.id === categoryFilter) ?? null : null;
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

      const hay = [
        tx.title ?? "",
        tx.categoryName ?? "",
        tx.note ?? "",
        tx.type ?? "",
      ]
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

    const out: Row[] = [];
    let lastKey = "";

    for (const tx of sorted) {
      const key = transactionDayKey(tx) || "unknown";
      const d = key === "unknown" ? null : safeDate(key);

      if (key !== lastKey) {
        lastKey = key;
        out.push({ type: "header", id: `h_${key}`, title: d ? dayTitle(d) : "Unknown date" });
      }

      out.push({ type: "tx", id: tx.id, tx });
    }

    return out;
  }, [filtered]);

  const rangeLabel =
    range === "today"
      ? "Today · loaded activity"
      : range === "week"
        ? "Last 7 days · loaded activity"
        : range === "month"
          ? `${format(selectedMonth, "MMMM yyyy")} · loaded activity`
          : "Latest loaded activity";

  const emptyTitle = query.trim()
    ? "No matches"
    : bookTransactions.length === 0
      ? "No transactions yet"
      : activeCategory
        ? `No ${activeCategory.name} activity`
        : range === "today"
          ? "No loaded activity today"
          : range === "week"
            ? "No loaded activity in the last 7 days"
            : range === "month"
              ? `No loaded activity in ${format(selectedMonth, "MMMM")}`
              : "No loaded transactions";

  const emptyMessage = query.trim()
    ? "Try a different search or clear the filter."
    : bookTransactions.length === 0
      ? "Log your first expense or income and it will appear here."
      : activeCategory
        ? `Try a different category, or clear the "${activeCategory.name}" filter.`
        : range === "today"
          ? "No transaction dated today is present in the latest loaded records."
          : range === "week"
            ? "No transaction from the last 7 days is present in the latest loaded records."
            : "Only the latest loaded records are available in this version.";

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 12 }}>
      <View className="px-6">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <AppText variant="2xl">Transactions</AppText>
            <AppText variant="sm" tone="muted" className="mt-1">
              {rangeLabel}
            </AppText>
          </View>
        </View>

        <Card variant="surface" className="mt-5">
          <View className="flex-row items-center justify-between">
            <View>
              <AppText variant="xs" tone="muted" className="uppercase">
                Net of loaded items
              </AppText>
              <AppText
                variant="2xl"
                className="mt-1"
                style={{ color: balanceColor(totals.netCents) }}
              >
                {formatCurrency(totals.netCents, currency)}
              </AppText>
            </View>

            <HapticPressable
              onPress={() => router.push("/modals/add-transaction")}
              haptic="impactLight"
              className="h-12 w-12 items-center justify-center rounded-full bg-accent"
              android_ripple={{ color: "#FFFFFF22", borderless: true }}
            >
              <Ionicons name="add" size={24} color={tokens.colors.white} />
            </HapticPressable>
          </View>
        </Card>

        <View className="mt-3 flex-row" style={{ gap: 8 }}>
          <SummaryStat compact label="Income" value={formatCurrency(totals.incomeCents, currency)} tone="income" />
          <SummaryStat compact label="Expense" value={formatCurrency(totals.expenseCents, currency)} tone="expense" />
          <SummaryStat compact label="Items" value={String(totals.count)} tone="neutral" />
        </View>

        <View className="mt-4 flex-row items-center" style={{ gap: 8 }}>
          <RangeChip label="Today" active={range === "today"} onPress={() => setRange("today")} />
          <RangeChip label="7 Days" active={range === "week"} onPress={() => setRange("week")} />
          <RangeChip label="Month" active={range === "month"} onPress={() => setRange("month")} />
          <RangeChip label="Recent" active={range === "all"} onPress={() => setRange("all")} />
        </View>

        {bookCategories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-row">
              <CategoryChip
                label="All categories"
                active={!categoryFilter}
                onPress={() => setCategoryFilter(null)}
              />
              {bookCategories.map((c) => (
                <CategoryChip
                  key={c.id}
                  label={c.name}
                  icon={c.icon}
                  color={c.color}
                  active={categoryFilter === c.id}
                  onPress={() => setCategoryFilter((cur) => (cur === c.id ? null : c.id))}
                />
              ))}
            </View>
          </ScrollView>
        ) : null}

        {range === "month" ? (
          <View className="mt-3 flex-row items-center justify-between rounded-lg border border-stroke bg-surface p-2">
            <IconButton icon="chevron-back" onPress={() => setSelectedMonth((m) => addMonths(m, -1))} />
            <View className="items-center">
              <AppText variant="lg">{format(selectedMonth, "MMMM yyyy")}</AppText>
              <AppText variant="xs" tone="muted" className="mt-0.5">
                Tap arrows to review another month
              </AppText>
            </View>
            <IconButton icon="chevron-forward" onPress={() => setSelectedMonth((m) => addMonths(m, 1))} />
          </View>
        ) : null}

        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search transactions"
          autoCorrect={false}
          autoCapitalize="none"
          variant="search"
          leftIcon={<Ionicons name="search" size={22} color={tokens.colors.muted} />}
          containerClassName="mt-3"
        />
      </View>

      <View className="flex-1 px-6 mt-3">
        {hydrationError ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="Couldn’t load transactions"
              message="Retry to refresh your transaction history."
              actionLabel="Retry"
              onAction={retryHydration}
              className="px-0"
            />
          </View>
        ) : !isHydrated ? (
          <View className="gap-3 pt-2">
            <Skeleton height={120} borderRadius={24} />
            <Skeleton height={120} borderRadius={24} />
            <Skeleton height={120} borderRadius={24} />
          </View>
        ) : rows.length === 0 ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title={emptyTitle}
              message={emptyMessage}
              actionLabel="Add transaction"
              onAction={() => router.push("/modals/add-transaction")}
              className="px-0"
            />
          </View>
        ) : (
          <FlashList
            data={rows}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => {
              if (item.type === "header") return <SectionHeader title={item.title} />;
              return <TransactionRow item={item.tx} />;
            }}
            ItemSeparatorComponent={() => <View className="h-2" />}
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
