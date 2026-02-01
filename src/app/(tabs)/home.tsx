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

function TotalBalanceCard({
  netCents,
  incomeCents,
  expenseCents,
}: {
  netCents: number;
  incomeCents: number;
  expenseCents: number;
}) {
  const netColor = netCents < 0 ? tokens.colors.danger : tokens.colors.text;

  return (
    <View
      className="rounded-[28px] border border-stroke overflow-hidden"
      style={{ backgroundColor: tokens.colors.surface }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: -120,
          top: -140,
          width: 320,
          height: 320,
          borderRadius: 999,
          backgroundColor: "rgba(0,200,5,0.12)",
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: -160,
          bottom: -160,
          width: 360,
          height: 360,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.04)",
        }}
      />

      <View style={{ padding: 18 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-muted text-xs tracking-widest">TOTAL BALANCE</Text>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: "rgba(0,200,5,0.9)" }} />
            <Text className="text-muted text-xs">Live</Text>
          </View>
        </View>

        <Text
          className="mt-2"
          style={{
            color: netColor,
            fontSize: 44,
            fontWeight: "900",
            letterSpacing: -0.8,
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatMoney2(netCents)}
        </Text>

        <View className="flex-row mt-4" style={{ gap: 10 }}>
          <View
            className="rounded-full border border-stroke px-4 py-2"
            style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            <Text className="text-muted text-[11px]">Income</Text>
            <Text
              style={{
                color: tokens.colors.accent,
                fontWeight: "900",
                marginTop: 2,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatMoney0(incomeCents)}
            </Text>
          </View>

          <View
            className="rounded-full border border-stroke px-4 py-2"
            style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            <Text className="text-muted text-[11px]">Expense</Text>
            <Text
              style={{
                color: tokens.colors.text,
                fontWeight: "900",
                marginTop: 2,
                opacity: 0.9,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatMoney0(expenseCents)}
            </Text>
          </View>
        </View>

        <View
          style={{
            marginTop: 14,
            height: 10,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.05)",
            borderWidth: 1,
            borderColor: tokens.colors.stroke,
            overflow: "hidden",
          }}
        >
          <View style={{ width: "58%", height: "100%", backgroundColor: "rgba(0,200,5,0.20)" }} />
        </View>
      </View>
    </View>
  );
}

function BudgetMiniCard({
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
      className="rounded-[26px] border border-stroke bg-surface"
      style={{
        width: 168,
        height: 160,
        padding: 14,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View
          className="h-9 w-9 items-center justify-center rounded-full border border-stroke"
          style={{ backgroundColor: over ? "rgba(255,68,68,0.10)" : "rgba(0,200,5,0.10)" }}
        >
          <Ionicons name="pricetag-outline" size={16} color={ringColor} />
        </View>
        <Ionicons name="ellipsis-horizontal" size={16} color={tokens.colors.muted} />
      </View>

      <View style={{ marginTop: 10, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 84, height: 84, alignItems: "center", justifyContent: "center" }}>
          <RingProgress size={84} stroke={8} progress={progress} color={ringColor} />
          <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
            <Text className="text-muted text-[10px] tracking-widest">{over ? "OVER" : "LEFT"}</Text>
            <Text style={{ color: ringColor, fontWeight: "900", marginTop: 4, fontVariant: ["tabular-nums"] }}>
              {formatMoney0(Math.abs(remaining))}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <Text className="text-text text-sm font-semibold" numberOfLines={1}>
          {category}
        </Text>
        <Text className="text-muted text-[11px] mt-1" numberOfLines={1}>
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
    setCrunching(true);
    const t = setTimeout(() => setCrunching(false), 520);
    return () => clearTimeout(t);
  }, [selectedBookId]);

  const selectedBookName = useMemo(
    () => books.find((b) => b.id === selectedBookId)?.name ?? "Personal",
    [books, selectedBookId]
  );

  const bookTxs = useMemo(() => txs.filter((t) => t.bookId === selectedBookId), [txs, selectedBookId]);

  const balance = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of bookTxs) {
      if (t.kind === "income") income += t.amountCents;
      else expense += t.amountCents;
    }
    return { incomeCents: income, expenseCents: expense, netCents: income - expense };
  }, [bookTxs]);

  const summary = useMemo(() => {
    const bookBudgets = budgets.filter((b) => b.bookId === selectedBookId);

    const spentByCat = new Map<string, number>();
    for (const t of bookTxs) {
      if (t.kind !== "expense") continue;
      const c = (t.category || "Uncategorized").trim() || "Uncategorized";
      spentByCat.set(c, (spentByCat.get(c) ?? 0) + t.amountCents);
    }

    const budgetItems = bookBudgets
      .map((b) => ({
        category: b.category,
        spentCents: spentByCat.get(b.category) ?? 0,
        budgetCents: b.budgetCents,
      }))
      .sort((a, b) => {
        const aRem = a.budgetCents - a.spentCents;
        const bRem = b.budgetCents - b.spentCents;
        const aOver = aRem < 0;
        const bOver = bRem < 0;
        if (aOver !== bOver) return aOver ? -1 : 1;
        return (b.spentCents / Math.max(1, b.budgetCents)) - (a.spentCents / Math.max(1, a.budgetCents));
      });

    const recent = [...bookTxs]
      .sort((a, b) => (Date.parse(b.occurredAt) || 0) - (Date.parse(a.occurredAt) || 0))
      .slice(0, 4);

    return { budgetItems, recent };
  }, [budgets, bookTxs, selectedBookId]);

  const assistantState: CharacterState =
    crunching ? "thinking" : summary.budgetItems.length ? "happy" : "waiting";

  const showSkeleton = crunching && summary.budgetItems.length === 0 && summary.recent.length === 0;

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 10 }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 120 }}
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

          <View className="mt-5 rounded-3xl border border-stroke bg-surface px-5 py-4 flex-row items-center">
            <CharacterWidget state={assistantState} size={44} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text className="text-text font-semibold">Assistant</Text>
              {crunching ? (
                <StreamingText className="text-muted mt-1" text="Crunching…" speedMs={18} />
              ) : summary.budgetItems.length ? (
                <Text className="text-muted mt-1">Budget status updated.</Text>
              ) : (
                <Text className="text-muted mt-1">Add budgets to unlock insights.</Text>
              )}
            </View>
            <Ionicons name="sparkles-outline" size={18} color={tokens.colors.muted} />
          </View>
        </View>

        {/* Total Balance */}
        <View className="px-6 mt-6">
          {showSkeleton ? (
            <Skeleton height={176} borderRadius={28} />
          ) : (
            <TotalBalanceCard
              netCents={balance.netCents}
              incomeCents={balance.incomeCents}
              expenseCents={balance.expenseCents}
            />
          )}
        </View>

        {/* Budgets: single short row (2–3 visible) */}
        <View className="px-6 mt-7">
          <View className="flex-row items-center justify-between">
            <Text className="text-text text-xl font-semibold">Budgets</Text>
            <HapticPressable
              onPress={() => router.push("/(tabs)/categories")}
              haptic="selection"
              pressScale={0.98}
              className="px-3 py-2 rounded-full"
              android_ripple={{ color: "#FFFFFF10", borderless: true }}
            >
              <Text style={{ color: tokens.colors.accent }} className="font-semibold">
                Manage
              </Text>
            </HapticPressable>
          </View>
        </View>

        <View className="mt-4">
          {showSkeleton ? (
            <View className="px-6 flex-row" style={{ gap: 12 }}>
              <Skeleton height={160} borderRadius={26} width={168 as any} />
              <Skeleton height={160} borderRadius={26} width={168 as any} />
              <Skeleton height={160} borderRadius={26} width={168 as any} />
            </View>
          ) : summary.budgetItems.length === 0 ? (
            <View className="px-6">
              <View className="w-full rounded-3xl border border-stroke bg-surface p-5">
                <Text className="text-text font-semibold">Add category budgets</Text>
                <Text className="text-muted mt-2">Go to Categories → set budgets, then return here.</Text>
              </View>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingRight: 30 }}
            >
              {summary.budgetItems.slice(0, 8).map((b) => (
                <BudgetMiniCard
                  key={b.category}
                  category={b.category}
                  spentCents={b.spentCents}
                  budgetCents={b.budgetCents}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Recent transactions visible on same screen */}
        <View className="px-6 mt-7">
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
                const amount = t.kind === "expense" ? -t.amountCents : t.amountCents;
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
                      <Text style={{ color: amtColor, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
                        {formatMoney2(amount)}
                      </Text>
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
