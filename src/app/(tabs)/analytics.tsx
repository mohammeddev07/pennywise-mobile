import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, isSameDay, parseISO, startOfDay, subDays } from "date-fns";
import { useRouter } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { BookPill } from "@/shared/ui/components/BookPill";
import { useTransactionsStore, type Transaction } from "@/features/transactions/store";
import { useCategoriesStore } from "@/features/categories/store";
import { useBooksStore } from "@/features/books/store";

type RangeKey = "week" | "month" | "all";

function safeDate(iso: string) {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function inRange(tx: Transaction, range: RangeKey) {
  if (range === "all") return true;
  const d = safeDate(tx.occurredAt);
  if (!d) return false;

  const now = new Date();
  const since = range === "week" ? startOfDay(subDays(now, 6)) : startOfDay(subDays(now, 29));
  return d >= since;
}

function formatMoney(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(2);
  const [i, d] = dollars.split(".");
  const intWithSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${intWithSep}.${d}`;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const transactions = useTransactionsStore((s) => s.transactions);
  const categories = useCategoriesStore((s) => s.categories);

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);

  const selectedBookName = useMemo(() => {
    return books.find((b) => b.id === selectedBookId)?.name ?? "Personal";
  }, [books, selectedBookId]);

  const [range, setRange] = useState<RangeKey>("week");

  const bookTxs = useMemo(() => transactions.filter((t) => t.bookId === selectedBookId), [transactions, selectedBookId]);
  const filtered = useMemo(() => bookTxs.filter((tx) => inRange(tx, range)), [bookTxs, range]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const tx of filtered) {
      if (tx.kind === "income") income += tx.amountCents;
      else expense += tx.amountCents;
    }

    return { incomeCents: income, expenseCents: expense, netCents: income - expense };
  }, [filtered]);

  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of filtered) {
      if (tx.kind !== "expense") continue;
      const name = tx.category || "Uncategorized";
      map.set(name, (map.get(name) ?? 0) + tx.amountCents);
    }

    const rows = [...map.entries()]
      .map(([name, cents]) => {
        const hit = categories.find((c) => c.name === name);
        return {
          name,
          cents,
          icon: (hit?.icon as any) ?? ("pricetag-outline" as any),
          color: hit?.color ?? tokens.colors.muted,
        };
      })
      .sort((a, b) => b.cents - a.cents);

    const total = rows.reduce((sum, r) => sum + r.cents, 0);
    return { rows: rows.slice(0, 6), totalExpenseCents: total };
  }, [filtered, categories]);

  const last7 = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(now, 6 - i)));

    const perDay = days.map((day) => {
      let cents = 0;
      for (const tx of filtered) {
        if (tx.kind !== "expense") continue;
        const d = safeDate(tx.occurredAt);
        if (d && isSameDay(d, day)) cents += tx.amountCents;
      }
      return { day, cents };
    });

    const max = Math.max(1, ...perDay.map((x) => x.cents));
    return { perDay, max };
  }, [filtered]);

  const rangeLabel = range === "week" ? "Last 7 days" : range === "month" ? "Last 30 days" : "All time";

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 10 }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 24 }}>
        <View className="px-6">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-text text-2xl font-semibold">Analytics</Text>
              <Text className="text-muted mt-1">{rangeLabel}</Text>
              <View className="mt-4 self-start">
                <BookPill label={selectedBookName} onPress={() => router.push("/modals/book-switcher")} />
              </View>
            </View>

            <Pressable
              onPress={() => router.push("/modals/book-switcher")}
              className="h-11 w-11 items-center justify-center rounded-full border border-stroke bg-surface"
              android_ripple={{ color: "#FFFFFF12", borderless: true }}
            >
              <Ionicons name="swap-horizontal" size={18} color={tokens.colors.accent} />
            </Pressable>
          </View>

          <View className="mt-5 flex-row items-center gap-3">
            <Chip label="Week" active={range === "week"} onPress={() => setRange("week")} />
            <Chip label="Month" active={range === "month"} onPress={() => setRange("month")} />
            <Chip label="All" active={range === "all"} onPress={() => setRange("all")} />
          </View>
        </View>

        {/* Summary */}
        <View className="px-6 mt-8">
          <View className="rounded-3xl border border-stroke bg-surface p-5">
            <Text className="text-muted text-xs tracking-widest">NET</Text>
            <Text className="text-text text-4xl font-semibold mt-2">{formatMoney(totals.netCents)}</Text>

            <View className="flex-row items-center mt-3">
              <View className="flex-row items-center">
                <Ionicons name="arrow-down" size={16} color={tokens.colors.accent} />
                <Text className="ml-2" style={{ color: tokens.colors.accent }}>
                  +{formatMoney(totals.incomeCents)} income
                </Text>
              </View>

              <View className="ml-5 flex-row items-center">
                <Ionicons name="arrow-up" size={16} color={tokens.colors.danger} />
                <Text className="ml-2" style={{ color: tokens.colors.danger }}>
                  -{formatMoney(totals.expenseCents)} spend
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Trend */}
        <View className="px-6 mt-8">
          <View className="flex-row items-center justify-between">
            <Text className="text-text text-base font-semibold">Spending trend</Text>
            <Text className="text-muted text-xs">7-day</Text>
          </View>

          <View className="mt-4 rounded-3xl border border-stroke bg-surface p-5">
            <View className="flex-row items-end justify-between" style={{ height: 88 }}>
              {last7.perDay.map((d) => {
                const h = Math.max(6, Math.round((d.cents / last7.max) * 80));
                return (
                  <View key={d.day.toISOString()} className="items-center" style={{ width: 30 }}>
                    <View className="w-3 rounded-full bg-stroke" style={{ height: 82 }}>
                      <View className="w-3 rounded-full bg-accent" style={{ height: h, marginTop: 82 - h }} />
                    </View>
                    <Text className="text-muted text-[10px] mt-2">{format(d.day, "EE")[0]}</Text>
                  </View>
                );
              })}
            </View>

            <View className="h-px bg-stroke mt-5" />

            <View className="flex-row items-center justify-between mt-4">
              <Text className="text-muted">Total spend</Text>
              <Text className="text-text font-semibold">{formatMoney(totals.expenseCents)}</Text>
            </View>
          </View>
        </View>

        {/* Top categories */}
        <View className="px-6 mt-8">
          <Text className="text-text text-base font-semibold">Top categories</Text>
          <Text className="text-muted mt-1 text-xs">By spending</Text>

          <View className="mt-4 rounded-3xl border border-stroke bg-surface overflow-hidden">
            {topCategories.rows.length === 0 ? (
              <View className="p-6 items-center">
                <Text className="text-muted">No expense data yet.</Text>
              </View>
            ) : (
              topCategories.rows.map((c, idx) => {
                const pct = topCategories.totalExpenseCents <= 0 ? 0 : c.cents / topCategories.totalExpenseCents;

                return (
                  <View key={c.name} className="px-5 py-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View
                          className="h-11 w-11 items-center justify-center rounded-2xl border border-stroke"
                          style={{ backgroundColor: `${c.color}22` }}
                        >
                          <Ionicons name={c.icon} size={20} color={c.color} />
                        </View>

                        <View className="ml-4 flex-1">
                          <Text className="text-text font-semibold" numberOfLines={1}>
                            {c.name}
                          </Text>
                          <View className="mt-2 h-2 w-full rounded-full bg-stroke overflow-hidden">
                            <View
                              className="h-2 rounded-full"
                              style={{
                                width: `${Math.max(4, Math.round(pct * 100))}%`,
                                backgroundColor: c.color === tokens.colors.muted ? tokens.colors.accent : c.color,
                              }}
                            />
                          </View>
                        </View>
                      </View>

                      <Text className="text-text font-semibold ml-4">{formatMoney(c.cents)}</Text>
                    </View>

                    {idx !== topCategories.rows.length - 1 ? <View className="h-px bg-stroke mt-4" /> : null}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Text
      onPress={onPress as any}
      className="rounded-full border px-4 py-2 text-sm font-semibold"
      style={{
        borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
        backgroundColor: active ? "#00C80522" : "transparent",
        color: active ? tokens.colors.accent : tokens.colors.text,
        overflow: "hidden",
      }}
    >
      {label}
    </Text>
  );
}
