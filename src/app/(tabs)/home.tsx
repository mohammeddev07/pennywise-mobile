import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/shared/ui/theme/tokens";
import { BookPill } from "@/shared/ui/components/BookPill";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { RingProgress } from "@/shared/ui/components/RingProgress";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { StreamingText } from "@/shared/ui/components/StreamingText";
import { CharacterWidget, type CharacterState } from "@/shared/ui/components/CharacterWidget";

import { useBooksStore } from "@/features/books/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useBudgetsStore } from "@/features/budgets/store";

function formatMoney2(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(2);
  const [i, d] = dollars.split(".");
  const intWithSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${intWithSep}.${d}`;
}

function formatMoney0(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(0);
  const intWithSep = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${intWithSep}`;
}

function BudgetCard({
  category,
  spentCents,
  budgetCents,
}: {
  category: string;
  spentCents: number;
  budgetCents: number;
}) {
  const remaining = budgetCents - spentCents;
  const over = remaining < 0;

  const ringColor = over ? tokens.colors.danger : tokens.colors.accent;
  const progress = Math.min(1, spentCents / Math.max(1, budgetCents));

  return (
    <View
      className="rounded-[28px] border border-stroke bg-surface"
      style={{ padding: 16, minHeight: 190 }}
    >
      <View className="flex-row items-center justify-between">
        <View
          className="h-10 w-10 items-center justify-center rounded-full border border-stroke"
          style={{ backgroundColor: over ? "rgba(255,68,68,0.10)" : "rgba(0,200,5,0.10)" }}
        >
          <Ionicons name="pricetag-outline" size={18} color={ringColor} />
        </View>
        <Ionicons name="ellipsis-horizontal" size={18} color={tokens.colors.muted} />
      </View>

      <View style={{ marginTop: 14, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 106, height: 106, alignItems: "center", justifyContent: "center" }}>
          <RingProgress size={106} stroke={10} progress={progress} color={ringColor} />
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text className="text-muted text-xs tracking-widest">{over ? "OVER" : "LEFT"}</Text>
            <Text style={{ color: ringColor, fontWeight: "800", marginTop: 6 }}>
              {formatMoney0(Math.abs(remaining))}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <Text className="text-text text-base font-semibold" numberOfLines={1}>
          {category}
        </Text>
        <Text className="text-muted text-xs mt-1">
          {formatMoney0(spentCents)} / {formatMoney0(budgetCents)}
        </Text>
      </View>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const books = useBooksStore((s) => s.books);

  const txs = useTransactionsStore((s) => s.transactions);
  const budgets = useBudgetsStore((s) => s.budgets);

  const [crunching, setCrunching] = useState(true);

  useEffect(() => {
    // small premium "processing" moment, then settle (no spinner)
    setCrunching(true);
    const t = setTimeout(() => setCrunching(false), 520);
    return () => clearTimeout(t);
  }, [selectedBookId]);

  const selectedBookName = useMemo(
    () => books.find((b) => b.id === selectedBookId)?.name ?? "Personal",
    [books, selectedBookId]
  );

  const bookTxs = useMemo(() => txs.filter((t) => t.bookId === selectedBookId), [txs, selectedBookId]);

  const summary = useMemo(() => {
    const bookBudgets = budgets.filter((b) => b.bookId === selectedBookId);

    const spentByCat = new Map<string, number>();
    for (const t of bookTxs) {
      if (t.kind !== "expense") continue;
      const c = (t.category || "Uncategorized").trim() || "Uncategorized";
      spentByCat.set(c, (spentByCat.get(c) ?? 0) + t.amountCents);
    }

    const items = bookBudgets
      .map((b) => {
        const spent = spentByCat.get(b.category) ?? 0;
        return { category: b.category, spentCents: spent, budgetCents: b.budgetCents };
      })
      .sort((a, b) => {
        const aRem = a.budgetCents - a.spentCents;
        const bRem = b.budgetCents - b.spentCents;
        const aOver = aRem < 0;
        const bOver = bRem < 0;
        if (aOver !== bOver) return aOver ? -1 : 1;
        const aProg = a.spentCents / Math.max(1, a.budgetCents);
        const bProg = b.spentCents / Math.max(1, b.budgetCents);
        return bProg - aProg;
      });

    const totalBudget = bookBudgets.reduce((s, b) => s + b.budgetCents, 0);
    const totalSpent = items.reduce((s, i) => s + i.spentCents, 0);
    const remaining = totalBudget - totalSpent;

    const recent = [...bookTxs]
      .sort((a, b) => (Date.parse(b.occurredAt) || 0) - (Date.parse(a.occurredAt) || 0))
      .slice(0, 4);

    return { items, totalBudget, totalSpent, remaining, recent };
  }, [budgets, bookTxs, selectedBookId]);

  const assistantState: CharacterState = crunching ? "thinking" : summary.items.length ? "happy" : "waiting";

  const showSkeleton = crunching && summary.items.length === 0 && summary.recent.length === 0;

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 10 }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 140 }}
      >
        {/* Header */}
        <View className="px-6">
          <View className="flex-row items-center justify-between">
            <BookPill label={selectedBookName} onPress={() => router.push("/modals/book-switcher")} />

            <HapticPressable
              onPress={() => {}}
              className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface"
              android_ripple={{ color: "#FFFFFF12", borderless: true }}
            >
              <Ionicons name="notifications-outline" size={18} color={tokens.colors.text} />
            </HapticPressable>
          </View>

          <Text className="text-muted mt-2">Pro Budget Monitor</Text>

          {/* Character slot */}
          <View className="mt-5 rounded-3xl border border-stroke bg-surface px-5 py-4 flex-row items-center">
            <CharacterWidget state={assistantState} size={44} />

            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text className="text-text font-semibold">Assistant</Text>
              {crunching ? (
                <StreamingText className="text-muted mt-1" text="Crunching…" speedMs={18} />
              ) : summary.items.length ? (
                <Text className="text-muted mt-1">Budget status updated.</Text>
              ) : (
                <Text className="text-muted mt-1">Add budgets to unlock insights.</Text>
              )}
            </View>

            <Ionicons name="sparkles-outline" size={18} color={tokens.colors.muted} />
          </View>
        </View>

        {/* Budget summary */}
        <View className="px-6 mt-7">
          {showSkeleton ? (
            <Skeleton height={74} borderRadius={24} />
          ) : (
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-muted text-xs tracking-widest">TOTAL BUDGET</Text>
                <Text className="text-text text-4xl font-semibold mt-2">
                  {summary.totalBudget > 0 ? formatMoney2(summary.totalBudget) : "$0.00"}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text className="text-muted text-xs tracking-widest">REMAINING</Text>
                <Text
                  className="text-3xl font-semibold mt-2"
                  style={{ color: summary.remaining < 0 ? tokens.colors.danger : tokens.colors.accent }}
                >
                  {summary.totalBudget > 0 ? formatMoney0(summary.remaining) : "$0"}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Budget grid */}
        <View className="px-6 mt-6" style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {showSkeleton ? (
            <>
              <View style={{ width: "48%" }}>
                <Skeleton height={190} borderRadius={28} />
              </View>
              <View style={{ width: "48%" }}>
                <Skeleton height={190} borderRadius={28} />
              </View>
              <View style={{ width: "48%" }}>
                <Skeleton height={190} borderRadius={28} />
              </View>
              <View style={{ width: "48%" }}>
                <Skeleton height={190} borderRadius={28} />
              </View>
            </>
          ) : summary.items.length === 0 ? (
            <View className="w-full rounded-3xl border border-stroke bg-surface p-5">
              <Text className="text-text font-semibold">Add category budgets</Text>
              <Text className="text-muted mt-2">Go to Categories → set budgets, then return here.</Text>
            </View>
          ) : (
            summary.items.slice(0, 6).map((b) => (
              <View key={b.category} style={{ width: "48%" }}>
                <BudgetCard category={b.category} spentCents={b.spentCents} budgetCents={b.budgetCents} />
              </View>
            ))
          )}
        </View>

        {/* Recent transactions */}
        <View className="px-6 mt-8">
          <View className="flex-row items-center justify-between">
            <Text className="text-text text-xl font-semibold">Recent Transactions</Text>
            <HapticPressable
              onPress={() => router.push("/(tabs)/transactions")}
              haptic="selection"
              pressScale={0.98}
              className="px-3 py-2 rounded-full"
              android_ripple={{ color: "#FFFFFF10", borderless: true }}
            >
              <Text style={{ color: tokens.colors.accent }} className="font-semibold">
                View All
              </Text>
            </HapticPressable>
          </View>

          <View className="mt-4 rounded-3xl border border-stroke bg-surface overflow-hidden">
            {summary.recent.length === 0 ? (
              <View className="px-5 py-6">
                <Text className="text-muted">No transactions yet.</Text>
              </View>
            ) : (
              summary.recent.map((t, idx) => {
                const label = (t.title || "").trim().length ? t.title : t.category || "Uncategorized";
                const sub = (t.category || "Uncategorized").trim() || "Uncategorized";
                const amount = (t.kind === "expense" ? -t.amountCents : t.amountCents);
                const amtColor = amount < 0 ? tokens.colors.text : tokens.colors.accent;

                return (
                  <View key={t.id}>
                    <View className="px-5 py-4 flex-row items-center justify-between">
                      <View style={{ flex: 1, paddingRight: 14 }}>
                        <Text className="text-text font-semibold" numberOfLines={1}>
                          {label}
                        </Text>
                        <Text className="text-muted text-xs mt-1" numberOfLines={1}>
                          {sub}
                        </Text>
                      </View>
                      <Text style={{ color: amtColor, fontWeight: "700" }}>{formatMoney2(amount)}</Text>
                    </View>
                    {idx !== summary.recent.length - 1 ? <View className="h-px bg-stroke" /> : null}
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
