import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, isSameDay, parseISO, startOfDay, subDays } from "date-fns";
import { useRouter } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { BookPill } from "@/shared/ui/components/BookPill";
import { useTransactionsStore, type Transaction } from "@/features/transactions/store";
import { useCategoriesStore } from "@/features/categories/store";
import { useBooksStore } from "@/features/books/store";
import { useSettingsStore } from "@/features/settings/store";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { formatCurrency } from "@/shared/utils/formatCurrency";

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

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const transactions = useTransactionsStore((s) => s.transactions);
  const categories = useCategoriesStore((s) => s.categories);
  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);

  const txPersist = (useTransactionsStore as any).persist;
  const catsPersist = (useCategoriesStore as any).persist;
  const booksPersist = (useBooksStore as any).persist;

  const [txHydrated, setTxHydrated] = useState<boolean>(() => txPersist?.hasHydrated?.() ?? true);
  const [catsHydrated, setCatsHydrated] = useState<boolean>(() => catsPersist?.hasHydrated?.() ?? true);
  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => booksPersist?.hasHydrated?.() ?? true);
  const [hydrationError, setHydrationError] = useState(false);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    if (txPersist?.onFinishHydration) {
      const unsub = txPersist.onFinishHydration(() => setTxHydrated(true));
      unsubs.push(unsub);
      if (txPersist?.hasHydrated && !txPersist.hasHydrated()) txPersist?.rehydrate?.();
    }

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
      const txReady = txPersist?.hasHydrated ? txPersist.hasHydrated() : true;
      const catsReady = catsPersist?.hasHydrated ? catsPersist.hasHydrated() : true;
      const booksReady = booksPersist?.hasHydrated ? booksPersist.hasHydrated() : true;
      if (!txReady || !catsReady || !booksReady) {
        setHydrationError(true);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      for (const unsub of unsubs) unsub?.();
    };
  }, [booksPersist, catsPersist, txPersist]);

  const retryHydration = () => {
    setHydrationError(false);
    setTxHydrated(txPersist?.hasHydrated?.() ?? true);
    setCatsHydrated(catsPersist?.hasHydrated?.() ?? true);
    setBooksHydrated(booksPersist?.hasHydrated?.() ?? true);
    txPersist?.rehydrate?.();
    catsPersist?.rehydrate?.();
    booksPersist?.rehydrate?.();
  };

  const hydrated = txHydrated && catsHydrated && booksHydrated;

  const selectedBookName = useMemo(() => {
    return books.find((b) => b.id === selectedBookId)?.name ?? "Personal";
  }, [books, selectedBookId]);

  const [range, setRange] = useState<RangeKey>("week");

  const filtered = useMemo(() => {
    return transactions.filter((tx) => tx.bookId === selectedBookId && inRange(tx, range));
  }, [transactions, selectedBookId, range]);

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
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 12 }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 24 }}>
        <View className="px-6">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <AppText variant="2xl">Analytics</AppText>
              <AppText variant="sm" tone="muted" className="mt-1">
                {rangeLabel}
              </AppText>
              <View className="mt-3 self-start">
                <BookPill label={selectedBookName} onPress={() => router.push("/modals/book-switcher")} />
              </View>
            </View>

            <HapticPressable
              onPress={() => router.push("/modals/book-switcher")}
              className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface"
              android_ripple={{ color: "#FFFFFF12", borderless: true }}
            >
              <Ionicons name="swap-horizontal" size={18} color={tokens.colors.accent} />
            </HapticPressable>
          </View>

          <View className="mt-4 flex-row items-center gap-2">
            <RangeChip label="Week" active={range === "week"} onPress={() => setRange("week")} />
            <RangeChip label="Month" active={range === "month"} onPress={() => setRange("month")} />
            <RangeChip label="All" active={range === "all"} onPress={() => setRange("all")} />
          </View>
        </View>

        {hydrationError ? (
          <View className="px-6 mt-8">
            <EmptyState
              title="Couldn’t load analytics"
              message="Retry to refresh transactions and categories."
              actionLabel="Retry"
              onAction={retryHydration}
              className="px-0"
            />
          </View>
        ) : !hydrated ? (
          <View className="px-6 mt-8 gap-3">
            <Skeleton height={160} borderRadius={24} />
            <Skeleton height={180} borderRadius={24} />
            <Skeleton height={220} borderRadius={24} />
          </View>
        ) : filtered.length === 0 ? (
          <View className="px-6 mt-10">
            <EmptyState
              title="No analytics yet"
              message="Add transactions in this range to see trends and category insights."
              actionLabel="Add transaction"
              onAction={() => router.push("/modals/add-transaction")}
              className="px-0"
            />
          </View>
        ) : (
          <>
            <View className="px-6 mt-8">
              <Card variant="surface">
                <AppText variant="xs" tone="muted" className="uppercase">
                  Net
                </AppText>
                <AppText variant="amount" className="mt-2">
                  {formatCurrency(totals.netCents, primaryCurrency)}
                </AppText>

                <View className="mt-3 flex-row items-center">
                  <View className="flex-row items-center">
                    <Ionicons name="arrow-down" size={16} color={tokens.colors.accent} />
                    <AppText variant="sm" className="ml-2" style={{ color: tokens.colors.accent }}>
                      +{formatCurrency(totals.incomeCents, primaryCurrency)} income
                    </AppText>
                  </View>

                  <View className="ml-5 flex-row items-center">
                    <Ionicons name="arrow-up" size={16} color={tokens.colors.danger} />
                    <AppText variant="sm" className="ml-2" style={{ color: tokens.colors.danger }}>
                      -{formatCurrency(totals.expenseCents, primaryCurrency)} spend
                    </AppText>
                  </View>
                </View>
              </Card>
            </View>

            <View className="px-6 mt-8">
              <View className="flex-row items-center justify-between">
                <AppText variant="lg">Spending trend</AppText>
                <AppText variant="xs" tone="muted">
                  7-day
                </AppText>
              </View>

              <Card variant="surface" className="mt-3">
                <View className="flex-row items-end justify-between" style={{ height: 88 }}>
                  {last7.perDay.map((d) => {
                    const h = Math.max(6, Math.round((d.cents / last7.max) * 80));
                    return (
                      <View key={d.day.toISOString()} className="items-center" style={{ width: 30 }}>
                        <View className="w-3 rounded-full bg-stroke" style={{ height: 82 }}>
                          <View className="w-3 rounded-full bg-accent" style={{ height: h, marginTop: 82 - h }} />
                        </View>
                        <AppText variant="xs" tone="muted" className="mt-2">
                          {format(d.day, "EE")[0]}
                        </AppText>
                      </View>
                    );
                  })}
                </View>

                <View className="h-px bg-stroke mt-5" />

                <View className="flex-row items-center justify-between mt-3">
                  <AppText variant="sm" tone="muted">
                    Total spend
                  </AppText>
                  <AppText variant="base" style={{ fontFamily: "Inter_600SemiBold" }}>
                    {formatCurrency(totals.expenseCents, primaryCurrency)}
                  </AppText>
                </View>
              </Card>
            </View>

            <View className="px-6 mt-8">
              <AppText variant="lg">Top categories</AppText>
              <AppText variant="xs" tone="muted" className="mt-1">
                By spending
              </AppText>

              <Card variant="surface" className="mt-3 p-0 overflow-hidden">
                {topCategories.rows.map((c, idx) => {
                  const pct = topCategories.totalExpenseCents <= 0 ? 0 : c.cents / topCategories.totalExpenseCents;
                  const barColor = c.color === tokens.colors.muted ? tokens.colors.accent : c.color;

                  return (
                    <View key={c.name}>
                      <View className="px-4 py-3 flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1 pr-3">
                          <View
                            className="h-10 w-10 items-center justify-center rounded-lg border border-stroke"
                            style={{ backgroundColor: `${c.color}22` }}
                          >
                            <Ionicons name={c.icon} size={18} color={c.color} />
                          </View>

                          <View className="ml-3 flex-1">
                            <AppText variant="base" style={{ fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
                              {c.name}
                            </AppText>
                            <View className="mt-2 h-2 w-full rounded-full bg-stroke overflow-hidden">
                              <View
                                className="h-2 rounded-full"
                                style={{ width: `${Math.max(4, Math.round(pct * 100))}%`, backgroundColor: barColor }}
                              />
                            </View>
                          </View>
                        </View>

                        <AppText variant="base" style={{ fontFamily: "Inter_600SemiBold" }}>
                          {formatCurrency(c.cents, primaryCurrency)}
                        </AppText>
                      </View>

                      {idx !== topCategories.rows.length - 1 ? <View className="h-px bg-stroke" /> : null}
                    </View>
                  );
                })}
              </Card>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
