import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { addMonths, endOfDay, endOfMonth, format, isSameDay, parseISO, startOfDay, startOfMonth, subDays } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { BookPill } from "@/shared/ui/components/BookPill";
import { useTransactionsStore, type Transaction } from "@/features/transactions/store";
import { TransactionRow } from "@/shared/ui/components/TransactionRow";
import { useBooksStore } from "@/features/books/store";
import { useSettingsStore } from "@/features/settings/store";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { AppText } from "@/shared/ui/components/AppText";
import { Input } from "@/shared/ui/components/Input";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { Card } from "@/shared/ui/components/Card";
import { formatCurrency } from "@/shared/utils/formatCurrency";

type RangeKey = "today" | "month" | "all";

type Row =
  | { type: "header"; id: string; title: string }
  | { type: "tx"; id: string; tx: Transaction };

function inRange(tx: Transaction, range: RangeKey, month: Date) {
  if (range === "all") return true;

  const d = safeDate(tx.occurredAt);
  if (!d) return false;

  const now = new Date();

  if (range === "today") {
    return d >= startOfDay(now) && d <= endOfDay(now);
  }

  return d >= startOfMonth(month) && d <= endOfMonth(month);
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

function money(amountCents: number) {
  const abs = Math.abs(amountCents);
  return (abs / 100).toFixed(2);
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
      <AppText variant="sm" style={{ color: active ? tokens.colors.accent : tokens.colors.text, fontFamily: "Inter_600SemiBold" }}>
        {label}
      </AppText>
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

function SummaryStat({ label, value, tone }: { label: string; value: string; tone?: "income" | "expense" }) {
  const color = tone === "income" ? tokens.colors.accent : tone === "expense" ? tokens.colors.danger : tokens.colors.text;

  return (
    <View className="flex-1 min-h-14 rounded-lg border border-stroke bg-surface px-4 flex-row items-center justify-between">
      <AppText variant="xs" tone="muted">
        {label}
      </AppText>
      <AppText variant="sm" style={{ color, fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
        {value}
      </AppText>
    </View>
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
  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);

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

  const selectedBookName = useMemo(() => {
    return books.find((b) => b.id === selectedBookId)?.name ?? "Personal";
  }, [books, selectedBookId]);

  const [range, setRange] = useState<RangeKey>("today");
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [query, setQuery] = useState("");

  const bookTransactions = useMemo(() => {
    return transactions.filter((t) => t.bookId === selectedBookId);
  }, [transactions, selectedBookId]);

  const rangeTransactions = useMemo(() => {
    return bookTransactions.filter((tx) => inRange(tx, range, selectedMonth));
  }, [bookTransactions, range, selectedMonth]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rangeTransactions.filter((tx) => {
      if (!q) return true;

      const hay = [
        tx.title ?? "",
        tx.category ?? "",
        tx.note ?? "",
        tx.paymentMethod ?? "",
        tx.kind ?? "",
        tx.currency ?? "",
        money(tx.amountCents),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [query, rangeTransactions]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const tx of rangeTransactions) {
      if (tx.kind === "income") income += tx.amountCents;
      else expense += tx.amountCents;
    }

    return {
      incomeCents: income,
      expenseCents: expense,
      netCents: income - expense,
      count: rangeTransactions.length,
    };
  }, [rangeTransactions]);

  const rows = useMemo<Row[]>(() => {
    const sorted = [...filtered].sort((a, b) => {
      const da = safeDate(a.occurredAt)?.getTime() ?? 0;
      const db = safeDate(b.occurredAt)?.getTime() ?? 0;
      return db - da;
    });

    const out: Row[] = [];
    let lastKey = "";

    for (const tx of sorted) {
      const d = safeDate(tx.occurredAt) ?? new Date();
      const key = format(d, "yyyy-MM-dd");

      if (key !== lastKey) {
        lastKey = key;
        out.push({ type: "header", id: `h_${key}`, title: dayTitle(d) });
      }

      out.push({ type: "tx", id: tx.id, tx });
    }

    return out;
  }, [filtered]);

  const rangeLabel =
    range === "today"
      ? "Today"
      : range === "month"
        ? format(selectedMonth, "MMMM yyyy")
        : "All activity";

  const emptyTitle = query.trim()
    ? "No matches"
    : bookTransactions.length === 0
      ? "No transactions yet"
      : range === "today"
        ? "Nothing logged today"
        : range === "month"
          ? `No activity in ${format(selectedMonth, "MMMM")}`
          : "No transactions";

  const emptyMessage = query.trim()
    ? "Try a different search or clear the filter."
    : bookTransactions.length === 0
      ? "Log your first expense or income and it will appear here."
      : range === "today"
        ? "New transactions dated today will appear here immediately."
        : "Pick another month or switch to All.";

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 12 }}>
      <View className="px-6">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <AppText variant="2xl">Transactions</AppText>
            <AppText variant="sm" tone="muted" className="mt-1">
              {rangeLabel}
            </AppText>
          </View>

          <BookPill label={selectedBookName} onPress={() => router.push("/modals/book-switcher")} />
        </View>

        <Card variant="surface" className="mt-5">
          <View className="flex-row items-center justify-between">
            <View>
              <AppText variant="xs" tone="muted" className="uppercase">
                Net total
              </AppText>
              <AppText
                variant="2xl"
                className="mt-1"
                style={{ color: totals.netCents < 0 ? tokens.colors.danger : tokens.colors.text }}
              >
                {formatCurrency(totals.netCents, primaryCurrency)}
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
          <SummaryStat label="Income" value={formatCurrency(totals.incomeCents, primaryCurrency)} tone="income" />
          <SummaryStat label="Expense" value={formatCurrency(totals.expenseCents, primaryCurrency)} tone="expense" />
          <SummaryStat label="Items" value={String(totals.count)} />
        </View>

        <View className="mt-4 flex-row items-center" style={{ gap: 8 }}>
          <RangeChip label="Today" active={range === "today"} onPress={() => setRange("today")} />
          <RangeChip label="Month" active={range === "month"} onPress={() => setRange("month")} />
          <RangeChip label="All" active={range === "all"} onPress={() => setRange("all")} />
        </View>

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
