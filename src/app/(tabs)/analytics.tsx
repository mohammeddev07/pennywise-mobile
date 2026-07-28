import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { tokens } from "@/shared/ui/theme/tokens";
import { useCategoriesStore } from "@/features/categories/store";
import { useBooksStore } from "@/features/books/store";
import { useSettingsStore } from "@/features/settings/store";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import * as summaryApi from "@/shared/api/summary";

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const categories = useCategoriesStore((s) => s.categories);
  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);

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
  const month = useMemo(() => currentMonthKey(), []);
  const monthLabel = useMemo(() => format(new Date(), "MMMM yyyy"), []);
  const bookCurrency = books.find((book) => book.id === selectedBookId)?.currencyCode ?? primaryCurrency;

  const summaryQuery = useQuery({
    queryKey: ["summary", selectedBookId, month],
    queryFn: () => summaryApi.getMonthlySummary(selectedBookId, month),
    enabled: Boolean(selectedBookId),
  });

  const totals = useMemo(() => {
    const summary = summaryQuery.data;
    if (!summary) return null;
    return {
      incomeCents: summary.incomeTotalMinor,
      expenseCents: summary.expenseTotalMinor,
      netCents: summary.incomeTotalMinor - summary.expenseTotalMinor,
    };
  }, [summaryQuery.data]);

  const topCategories = useMemo(() => {
    const rows =
      summaryQuery.data?.byCategory
        .filter((item) => item.type === "EXPENSE")
        .map((item) => {
          const hit = categories.find((c) => c.id === item.categoryId);
          return {
            name: item.categoryName,
            cents: item.totalMinor,
            icon: (hit?.icon as any) ?? ("pricetag-outline" as any),
            color: hit?.color ?? tokens.colors.muted,
          };
        })
        .sort((a, b) => b.cents - a.cents) ?? [];
    const total = rows.reduce((sum, row) => sum + row.cents, 0);
    return { rows, totalExpenseCents: total };
  }, [categories, summaryQuery.data]);

  const currency = summaryQuery.data?.currencyCode ?? bookCurrency;
  const hasActivity = Boolean(totals && (totals.incomeCents !== 0 || totals.expenseCents !== 0));

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 12 }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 24 }}>
        <View className="px-6">
          <AppText variant="3xl">Insights</AppText>
          <AppText variant="sm" tone="muted" className="mt-1">
            Verified monthly totals for {monthLabel}.
          </AppText>
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
        ) : !hydrated || summaryQuery.isPending ? (
          <View className="px-6 mt-8 gap-3">
            <Skeleton height={160} borderRadius={24} />
            <Skeleton height={220} borderRadius={24} />
          </View>
        ) : summaryQuery.isError || !totals ? (
          <View className="px-6 mt-10">
            <EmptyState
              title="Couldn’t load this month’s summary"
              message="Totals stay hidden until they can be verified with the server."
              actionLabel="Retry"
              onAction={() => {
                void summaryQuery.refetch();
              }}
              className="px-0"
            />
          </View>
        ) : !hasActivity ? (
          <View className="px-6 mt-10">
            <EmptyState
              title={`No activity in ${monthLabel}`}
              message="Add an income or expense to see this month’s summary."
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
                  Net this month
                </AppText>
                <AppText variant="amount" className="mt-2">
                  {formatCurrency(totals.netCents, currency)}
                </AppText>

                <View className="mt-3 flex-row items-center">
                  <View className="flex-row items-center">
                    <Ionicons name="arrow-down" size={16} color={tokens.colors.accent} />
                    <AppText variant="sm" className="ml-2" style={{ color: tokens.colors.accent }}>
                      +{formatCurrency(totals.incomeCents, currency)} income
                    </AppText>
                  </View>

                  <View className="ml-5 flex-row items-center">
                    <Ionicons name="arrow-up" size={16} color={tokens.colors.danger} />
                    <AppText variant="sm" className="ml-2" style={{ color: tokens.colors.danger }}>
                      -{formatCurrency(totals.expenseCents, currency)} spend
                    </AppText>
                  </View>
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
                          {formatCurrency(c.cents, currency)}
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
