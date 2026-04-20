import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { format, isSameDay, parseISO, startOfDay, subDays } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { BookPill } from "@/shared/ui/components/BookPill";
import { useTransactionsStore, type Transaction } from "@/features/transactions/store";
import { TransactionRow } from "@/shared/ui/components/TransactionRow";
import { useBooksStore } from "@/features/books/store";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { AppText } from "@/shared/ui/components/AppText";
import { Input } from "@/shared/ui/components/Input";
import { Skeleton } from "@/shared/ui/components/Skeleton";

type RangeKey = "today" | "week" | "month" | "all";

type Row =
  | { type: "header"; id: string; title: string }
  | { type: "tx"; id: string; tx: Transaction };

function inRange(tx: Transaction, range: RangeKey) {
  if (range === "all") return true;

  const d = safeDate(tx.occurredAt);
  if (!d) return false;

  const now = new Date();

  if (range === "today") return isSameDay(d, now);

  if (range === "week") {
    const since = startOfDay(subDays(now, 6));
    return d >= since;
  }

  const since = startOfDay(subDays(now, 29));
  return d >= since;
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
      android_ripple={{ color: "#FFFFFF10" }}
      style={{
        borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
        backgroundColor: active ? `${tokens.colors.accent}22` : "transparent",
      }}
    >
      <AppText variant="sm" style={{ color: active ? tokens.colors.accent : tokens.colors.text }}>
        {label}
      </AppText>
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
  const [query, setQuery] = useState("");

  const bookTransactions = useMemo(() => {
    return transactions.filter((t) => t.bookId === selectedBookId);
  }, [transactions, selectedBookId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return bookTransactions.filter((tx) => {
      if (!inRange(tx, range)) return false;
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
  }, [bookTransactions, range, query]);

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

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 12 }}>
      <View className="px-6">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <AppText variant="2xl">Transactions</AppText>
            <View className="mt-3 self-start">
              <BookPill label={selectedBookName} onPress={() => router.push("/modals/book-switcher")} />
            </View>
          </View>

          <HapticPressable
            onPress={() => router.push("/modals/add-transaction")}
            haptic="impactLight"
            className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="add" size={20} color={tokens.colors.accent} />
          </HapticPressable>
        </View>

        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search title, category, note..."
          autoCorrect={false}
          autoCapitalize="none"
          containerClassName="mt-5"
        />

        <View className="mt-4 flex-row items-center gap-2">
          <RangeChip label="Today" active={range === "today"} onPress={() => setRange("today")} />
          <RangeChip label="Week" active={range === "week"} onPress={() => setRange("week")} />
          <RangeChip label="Month" active={range === "month"} onPress={() => setRange("month")} />
          <RangeChip label="All" active={range === "all"} onPress={() => setRange("all")} />
        </View>
      </View>

      <View className="flex-1 px-6 mt-4">
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
              title={query.trim() ? "No matches" : bookTransactions.length > 0 ? "No transactions in this range" : "No transactions yet"}
              message={
                query.trim()
                  ? "Try a different search or widen the date range."
                  : bookTransactions.length > 0
                    ? "Switch to a wider date range to see older activity."
                  : "Log your first expense or income and it will appear here."
              }
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
