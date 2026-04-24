import { useEffect, useMemo, useState } from "react";
import { View, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { tokens } from "@/shared/ui/theme/tokens";
import { Screen } from "@/shared/ui/components/Screen";
import { Card } from "@/shared/ui/components/Card";
import { AppText } from "@/shared/ui/components/AppText";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { TransactionRow } from "@/shared/ui/components/TransactionRow";
import { IconButton } from "@/shared/ui/components/IconButton";
import { Button } from "@/shared/ui/components/Button";
import { SectionHeader } from "@/shared/ui/components/SectionHeader";
import { SummaryStat } from "@/shared/ui/components/SummaryStat";
import { CategoryIcon } from "@/shared/ui/components/CategoryIcon";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

import { useAuthStore } from "@/features/auth/store";
import { useBooksStore } from "@/features/books/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useBudgetsStore } from "@/features/budgets/store";
import { useSettingsStore } from "@/features/settings/store";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { CurrencyCode } from "@/shared/types/models";

function monthKey(iso?: string) {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nowMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type BudgetItem = {
  category: string;
  spentCents: number;
  budgetCents: number;
};

function TrendLine() {
  return (
    <Svg width="100%" height={132} viewBox="0 0 320 132">
      <Defs>
        <LinearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={tokens.colors.accent} stopOpacity="0.22" />
          <Stop offset="1" stopColor={tokens.colors.accent} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      <Path
        d="M0 104 C30 84 46 96 70 74 C98 48 118 64 144 48 C174 28 190 52 218 36 C248 18 270 30 320 4 L320 132 L0 132 Z"
        fill="url(#balanceFill)"
      />
      <Path
        d="M0 104 C30 84 46 96 70 74 C98 48 118 64 144 48 C174 28 190 52 218 36 C248 18 270 30 320 4"
        fill="none"
        stroke={tokens.colors.accent}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <Circle cx="316" cy="6" r="9" fill={tokens.colors.accent} stroke={tokens.colors.white} strokeWidth="5" />
    </Svg>
  );
}

function BudgetPreview({ item, currency }: { item: BudgetItem; currency: CurrencyCode }) {
  const remaining = item.budgetCents - item.spentCents;
  const progress = Math.min(1, item.spentCents / Math.max(1, item.budgetCents));
  const over = remaining < 0;

  return (
    <Card style={{ width: 214 }} elevated>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <CategoryIcon icon="pie-chart-outline" color={over ? tokens.colors.danger : tokens.colors.accent} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="base" style={{ fontFamily: "Inter_700Bold" }} numberOfLines={1}>
            {item.category}
          </AppText>
          <AppText variant="sm" tone="muted" numberOfLines={1}>
            {formatCurrency(item.spentCents, currency, 0)} spent
          </AppText>
        </View>
      </View>
      <View
        style={{
          height: 8,
          marginTop: 18,
          borderRadius: tokens.radii.pill,
          backgroundColor: tokens.colors.neutralSoft,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: 8,
            borderRadius: tokens.radii.pill,
            backgroundColor: over ? tokens.colors.danger : tokens.colors.accent,
          }}
        />
      </View>
      <AppText
        variant="sm"
        style={{ marginTop: 14, color: over ? tokens.colors.danger : tokens.colors.accent, fontFamily: "Inter_700Bold" }}
      >
        {over ? `${formatCurrency(Math.abs(remaining), currency, 0)} over` : `${formatCurrency(remaining, currency, 0)} left`}
      </AppText>
    </Card>
  );
}

export default function Home() {
  const router = useRouter();

  const userEmail = useAuthStore((s) => s.userEmail);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const books = useBooksStore((s) => s.books);
  const transactions = useTransactionsStore((s) => s.transactions);
  const budgets = useBudgetsStore((s) => s.budgets);
  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);

  const booksPersist = (useBooksStore as any).persist;
  const txPersist = (useTransactionsStore as any).persist;
  const budgetsPersist = (useBudgetsStore as any).persist;

  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => booksPersist?.hasHydrated?.() ?? true);
  const [txHydrated, setTxHydrated] = useState<boolean>(() => txPersist?.hasHydrated?.() ?? true);
  const [budgetsHydrated, setBudgetsHydrated] = useState<boolean>(() => budgetsPersist?.hasHydrated?.() ?? true);
  const [hydrationError, setHydrationError] = useState(false);

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    if (booksPersist?.onFinishHydration) {
      const unsub = booksPersist.onFinishHydration(() => setBooksHydrated(true));
      unsubs.push(unsub);
      if (booksPersist?.hasHydrated && !booksPersist.hasHydrated()) booksPersist?.rehydrate?.();
    }
    if (txPersist?.onFinishHydration) {
      const unsub = txPersist.onFinishHydration(() => setTxHydrated(true));
      unsubs.push(unsub);
      if (txPersist?.hasHydrated && !txPersist.hasHydrated()) txPersist?.rehydrate?.();
    }
    if (budgetsPersist?.onFinishHydration) {
      const unsub = budgetsPersist.onFinishHydration(() => setBudgetsHydrated(true));
      unsubs.push(unsub);
      if (budgetsPersist?.hasHydrated && !budgetsPersist.hasHydrated()) budgetsPersist?.rehydrate?.();
    }
    const timeoutId = setTimeout(() => {
      const booksReady = booksPersist?.hasHydrated ? booksPersist.hasHydrated() : true;
      const txReady = txPersist?.hasHydrated ? txPersist.hasHydrated() : true;
      const budgetsReady = budgetsPersist?.hasHydrated ? budgetsPersist.hasHydrated() : true;
      if (!booksReady || !txReady || !budgetsReady) setHydrationError(true);
    }, 3000);
    return () => {
      clearTimeout(timeoutId);
      for (const unsub of unsubs) unsub?.();
    };
  }, [booksPersist, budgetsPersist, txPersist]);

  const isHydrated = booksHydrated && txHydrated && budgetsHydrated;
  const selectedBookName = useMemo(() => books.find((b) => b.id === selectedBookId)?.name ?? "Personal", [books, selectedBookId]);
  const displayName = useMemo(() => {
    const name = userEmail?.split("@")[0]?.trim();
    return name ? name.slice(0, 1).toUpperCase() + name.slice(1) : selectedBookName;
  }, [selectedBookName, userEmail]);

  const bookTransactions = useMemo(() => transactions.filter((t) => t.bookId === selectedBookId), [transactions, selectedBookId]);

  const balance = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of bookTransactions) {
      if (tx.kind === "income") income += tx.amountCents;
      else expense += tx.amountCents;
    }
    return { incomeCents: income, expenseCents: expense, netCents: income - expense };
  }, [bookTransactions]);

  const budgetItems = useMemo(() => {
    const currentMonth = nowMonthKey();
    const spentByCategory = new Map<string, number>();
    for (const tx of bookTransactions) {
      if (tx.kind !== "expense") continue;
      if (monthKey(tx.occurredAt) !== currentMonth) continue;
      const key = (tx.category || "Uncategorized").trim() || "Uncategorized";
      spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + tx.amountCents);
    }
    return budgets
      .filter((b) => b.bookId === selectedBookId)
      .map((b) => ({ category: b.category, budgetCents: b.budgetCents, spentCents: spentByCategory.get(b.category) ?? 0 }))
      .sort((a, b) => b.spentCents / Math.max(1, b.budgetCents) - a.spentCents / Math.max(1, a.budgetCents));
  }, [bookTransactions, budgets, selectedBookId]);

  const recentTransactions = useMemo(() => {
    return [...bookTransactions].sort((a, b) => (Date.parse(b.occurredAt) || 0) - (Date.parse(a.occurredAt) || 0)).slice(0, 4);
  }, [bookTransactions]);

  const retryHydration = () => {
    setHydrationError(false);
    setBooksHydrated(booksPersist?.hasHydrated?.() ?? true);
    setTxHydrated(txPersist?.hasHydrated?.() ?? true);
    setBudgetsHydrated(budgetsPersist?.hasHydrated?.() ?? true);
    booksPersist?.rehydrate?.();
    txPersist?.rehydrate?.();
    budgetsPersist?.rehydrate?.();
  };

  return (
    <Screen scroll bottom="tab">
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 1,
            borderColor: tokens.colors.stroke,
            backgroundColor: tokens.colors.greenSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppText variant="xl" style={{ color: tokens.colors.accent, fontFamily: "Inter_700Bold" }}>
            {displayName.slice(0, 1).toUpperCase()}
          </AppText>
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <AppText variant="lg" tone="muted">
            Good morning,
          </AppText>
          <AppText variant="2xl">{displayName}</AppText>
        </View>
        <IconButton icon="notifications-outline" onPress={() => router.push("/(tabs)/settings")} />
      </View>

      {hydrationError ? (
        <View style={{ marginTop: 24 }}>
          <EmptyState
            title="Couldn’t load dashboard"
            message="Retry to reload books, transactions, and budgets."
            actionLabel="Retry"
            onAction={retryHydration}
            className="px-0"
          />
        </View>
      ) : !isHydrated ? (
        <View style={{ marginTop: 24, gap: 12 }}>
          <Skeleton height={236} borderRadius={24} />
          <Skeleton height={68} borderRadius={24} />
          <Skeleton height={260} borderRadius={24} />
        </View>
      ) : (
        <>
          <Card style={{ marginTop: 28, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View>
                <AppText variant="lg" tone="muted">
                  Total Balance
                </AppText>
                <AppText
                  variant="amount"
                  style={{ marginTop: 14, color: balance.netCents < 0 ? tokens.colors.danger : tokens.colors.text }}
                >
                  {formatCurrency(balance.netCents, primaryCurrency)}
                </AppText>
                <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="trending-up" size={24} color={tokens.colors.accent} />
                  <AppText variant="lg" style={{ marginLeft: 8, color: tokens.colors.accent, fontFamily: "Inter_700Bold" }}>
                    +12.5%
                  </AppText>
                  <AppText variant="sm" tone="muted" style={{ marginLeft: 8 }}>
                    vs last month
                  </AppText>
                </View>
              </View>
              <HapticPressable
                onPress={() => router.push("/modals/book-switcher")}
                haptic="selection"
                style={{
                  minHeight: 44,
                  borderRadius: tokens.radii.pill,
                  borderWidth: 1,
                  borderColor: tokens.colors.stroke,
                  paddingHorizontal: 16,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <AppText variant="sm" style={{ fontFamily: "Inter_600SemiBold" }}>
                  {primaryCurrency}
                </AppText>
                <Ionicons name="chevron-down" size={16} color={tokens.colors.muted} style={{ marginLeft: 8 }} />
              </HapticPressable>
            </View>
            <View style={{ marginTop: 10 }}>
              <TrendLine />
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: -6 }}>
              <SummaryStat label="Income" value={formatCurrency(balance.incomeCents, primaryCurrency)} tone="income" />
              <SummaryStat label="Expense" value={formatCurrency(balance.expenseCents, primaryCurrency)} tone="expense" />
            </View>
          </Card>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Add Expense"
                onPress={() => router.push("/modals/add-transaction")}
                leftIcon={<Ionicons name="add" size={24} color={tokens.colors.white} />}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Transfer"
                variant="secondary"
                onPress={() => router.push("/modals/add-transaction")}
                leftIcon={<Ionicons name="swap-horizontal" size={24} color={tokens.colors.accent} />}
              />
            </View>
          </View>

          <View style={{ marginTop: 28 }}>
            <SectionHeader
              title="Recent Transactions"
              action={
                <HapticPressable onPress={() => router.push("/(tabs)/transactions")} haptic="selection" style={{ padding: 8 }}>
                  <AppText variant="base" style={{ color: tokens.colors.accent, fontFamily: "Inter_700Bold" }}>
                    View all
                  </AppText>
                </HapticPressable>
              }
            />
            {recentTransactions.length === 0 ? (
              <Card style={{ marginTop: 12 }}>
                <EmptyState
                  title="No transactions yet"
                  message="Add a transaction to start building your timeline."
                  actionLabel="Add transaction"
                  onAction={() => router.push("/modals/add-transaction")}
                  className="px-0"
                />
              </Card>
            ) : (
              <Card padding={0} style={{ marginTop: 12, overflow: "hidden" }}>
                {recentTransactions.map((tx, index) => (
                  <View key={tx.id}>
                    <TransactionRow item={tx} enableActions={false} embedded />
                    {index !== recentTransactions.length - 1 ? (
                      <View style={{ height: 1, marginLeft: 84, backgroundColor: tokens.colors.stroke }} />
                    ) : null}
                  </View>
                ))}
              </Card>
            )}
          </View>

          {budgetItems.length > 0 ? (
            <View style={{ marginTop: 28 }}>
              <SectionHeader
                title="Budgets"
                action={
                  <HapticPressable onPress={() => router.push("/(tabs)/categories")} haptic="selection" style={{ padding: 8 }}>
                    <AppText variant="base" style={{ color: tokens.colors.accent, fontFamily: "Inter_700Bold" }}>
                      Manage
                    </AppText>
                  </HapticPressable>
                }
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 12, paddingRight: 24 }}>
                {budgetItems.slice(0, 6).map((item) => (
                  <BudgetPreview key={item.category} item={item} currency={primaryCurrency} />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
