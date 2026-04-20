import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/shared/ui/theme/tokens";
import { BookPill } from "@/shared/ui/components/BookPill";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { Card } from "@/shared/ui/components/Card";
import { AppText } from "@/shared/ui/components/AppText";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { TransactionRow } from "@/shared/ui/components/TransactionRow";

import { useBooksStore } from "@/features/books/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useBudgetsStore } from "@/features/budgets/store";
import { useSettingsStore } from "@/features/settings/store";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { CurrencyCode } from "@/shared/types/models";

const COLORS = {
  bg: tokens.colors.app,
  surface: tokens.colors.surface,
  card: tokens.colors.card,
  stroke: tokens.colors.stroke,
  text: tokens.colors.text,
  muted: tokens.colors.muted,
  accent: tokens.colors.accent,
  danger: tokens.colors.danger,
} as const;

const SPACING = {
  0: tokens.space[0],
  4: tokens.space[1],
  8: tokens.space[2],
  12: tokens.space[3],
  16: tokens.space[4],
  20: tokens.space[5],
  24: tokens.space[6],
  32: tokens.space[7],
  40: tokens.space[8],
} as const;

const RADIUS = {
  input: tokens.radii.md,
  card: tokens.radii.lg,
  pill: tokens.radii.pill,
} as const;

const TYPOGRAPHY = tokens.typography;

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

function BudgetTile({ item, currency }: { item: BudgetItem; currency: CurrencyCode }) {
  const remaining = item.budgetCents - item.spentCents;
  const over = remaining < 0;
  const progress = Math.min(1, item.spentCents / Math.max(1, item.budgetCents));

  return (
    <Card variant="card" style={styles.budgetTile}>
      <AppText variant="base" style={styles.semibold} numberOfLines={1}>
        {item.category}
      </AppText>

      <AppText variant="sm" tone="muted" style={styles.mt4}>
        {formatCurrency(item.spentCents, currency)} of {formatCurrency(item.budgetCents, currency)}
      </AppText>

      {/* Thin progress keeps budget cards calm while still communicating state. */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: over ? COLORS.danger : COLORS.accent,
            },
          ]}
        />
      </View>

      <AppText variant="sm" style={[styles.mt12, styles.semibold, { color: over ? COLORS.danger : COLORS.accent }]}>
        {over ? `${formatCurrency(Math.abs(remaining), currency)} over` : `${formatCurrency(remaining, currency)} left`}
      </AppText>
    </Card>
  );
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const books = useBooksStore((s) => s.books);

  const transactions = useTransactionsStore((s) => s.transactions);
  const budgets = useBudgetsStore((s) => s.budgets);
  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);

  const booksPersist = (useBooksStore as any).persist;
  const txPersist = (useTransactionsStore as any).persist;
  const budgetsPersist = (useBudgetsStore as any).persist;

  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => {
    const has = booksPersist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });
  const [txHydrated, setTxHydrated] = useState<boolean>(() => {
    const has = txPersist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });
  const [budgetsHydrated, setBudgetsHydrated] = useState<boolean>(() => {
    const has = budgetsPersist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });
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

  const selectedBookName = useMemo(
    () => books.find((b) => b.id === selectedBookId)?.name ?? "Personal",
    [books, selectedBookId]
  );

  const bookTransactions = useMemo(
    () => transactions.filter((t) => t.bookId === selectedBookId),
    [transactions, selectedBookId]
  );

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
    const bookBudgets = budgets.filter((b) => b.bookId === selectedBookId);
    const currentMonth = nowMonthKey();

    const spentByCategory = new Map<string, number>();
    for (const tx of bookTransactions) {
      if (tx.kind !== "expense") continue;
      if (monthKey(tx.occurredAt) !== currentMonth) continue;
      const key = (tx.category || "Uncategorized").trim() || "Uncategorized";
      spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + tx.amountCents);
    }

    return bookBudgets
      .map((b) => ({
        category: b.category,
        budgetCents: b.budgetCents,
        spentCents: spentByCategory.get(b.category) ?? 0,
      }))
      .sort((a, b) => b.spentCents / Math.max(1, b.budgetCents) - a.spentCents / Math.max(1, a.budgetCents));
  }, [bookTransactions, budgets, selectedBookId]);

  const recentTransactions = useMemo(() => {
    return [...bookTransactions]
      .sort((a, b) => (Date.parse(b.occurredAt) || 0) - (Date.parse(a.occurredAt) || 0))
      .slice(0, 4);
  }, [bookTransactions]);

  const assistantCopy = !isHydrated
    ? "Preparing your workspace"
    : recentTransactions.length > 0
      ? "Latest activity is reflected across the app"
      : "Add a transaction to start seeing insights";

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
    <View style={[styles.screen, { paddingTop: insets.top + SPACING[12] }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: (insets.bottom || 0) + 120 }]}
      >
        <View style={styles.header}>
          <BookPill label={selectedBookName} onPress={() => router.push("/modals/book-switcher")} />

          <HapticPressable
            onPress={() => router.push("/modals/add-transaction")}
            haptic="impactLight"
            style={styles.iconButton}
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="add" size={20} color={COLORS.accent} />
          </HapticPressable>
        </View>

        {/* Ambient assistant hint replaces the heavy card so the balance remains the hero. */}
        <View style={styles.assistantPill}>
          <View style={styles.assistantDot} />
          <AppText variant="sm" tone="muted" numberOfLines={1} style={styles.assistantText}>
            {assistantCopy}
          </AppText>
        </View>

        {hydrationError ? (
          <View style={styles.stateBlock}>
            <EmptyState
              title="Couldn’t load dashboard"
              message="Retry to reload books, transactions, and budgets."
              actionLabel="Retry"
              onAction={retryHydration}
              className="px-0"
            />
          </View>
        ) : !isHydrated ? (
          <View style={styles.skeletonStack}>
            <Skeleton height={180} borderRadius={24} />
            <Skeleton height={160} borderRadius={24} />
            <Skeleton height={220} borderRadius={24} />
          </View>
        ) : (
          <>
            <Card variant="surface" style={styles.balanceCard}>
              <AppText variant="xs" tone="muted" style={styles.uppercase}>
                Total balance
              </AppText>
              <AppText
                variant="amount"
                style={[styles.balanceAmount, { color: balance.netCents < 0 ? COLORS.danger : COLORS.text }]}
              >
                {formatCurrency(balance.netCents, primaryCurrency)}
              </AppText>

              <View style={styles.statRow}>
                <View style={styles.statChip}>
                  <AppText variant="xs" tone="muted">
                    Income
                  </AppText>
                  <AppText variant="base" style={[styles.statValue, { color: COLORS.accent }]}>
                    {formatCurrency(balance.incomeCents, primaryCurrency)}
                  </AppText>
                </View>

                <View style={styles.statChip}>
                  <AppText variant="xs" tone="muted">
                    Expense
                  </AppText>
                  <AppText variant="base" style={styles.statValue}>
                    {formatCurrency(balance.expenseCents, primaryCurrency)}
                  </AppText>
                </View>
              </View>
            </Card>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppText variant="xl">Budgets</AppText>
                <HapticPressable
                  onPress={() => router.push("/(tabs)/categories")}
                  haptic="selection"
                  pressScale={0.98}
                  style={styles.textButton}
                  android_ripple={{ color: "#FFFFFF10", borderless: true }}
                >
                  <AppText variant="sm" style={styles.accentText}>
                    Manage
                  </AppText>
                </HapticPressable>
              </View>

              {budgetItems.length === 0 ? (
                <Card variant="surface" style={styles.emptyCard}>
                  <EmptyState
                    title="No budgets yet"
                    message="Set category budgets to track monthly progress."
                    actionLabel="Set budget"
                    onAction={() => router.push("/(tabs)/categories")}
                    className="px-0"
                  />
                </Card>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.budgetScroll}
                >
                  {budgetItems.slice(0, 6).map((item) => (
                    <View key={item.category} style={styles.budgetGap}>
                      <BudgetTile item={item} currency={primaryCurrency} />
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppText variant="xl">Recent transactions</AppText>
                <HapticPressable
                  onPress={() => router.push("/(tabs)/transactions")}
                  haptic="selection"
                  pressScale={0.98}
                  style={styles.textButton}
                  android_ripple={{ color: "#FFFFFF10", borderless: true }}
                >
                  <AppText variant="sm" style={styles.accentText}>
                    View all
                  </AppText>
                </HapticPressable>
              </View>

              {recentTransactions.length === 0 ? (
                <Card variant="surface" style={styles.emptyCard}>
                  <EmptyState
                    title="No transactions yet"
                    message="Add a transaction to start building your timeline."
                    actionLabel="Add transaction"
                    onAction={() => router.push("/modals/add-transaction")}
                    className="px-0"
                  />
                </Card>
              ) : (
                <View style={styles.transactionStack}>
                  {recentTransactions.map((tx) => (
                    <TransactionRow key={tx.id} item={tx} enableActions={false} />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingHorizontal: SPACING[24],
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  assistantPill: {
    minHeight: 44,
    marginTop: SPACING[12],
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING[16],
  },
  assistantDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    marginRight: SPACING[8],
  },
  assistantText: {
    maxWidth: 300,
  },
  stateBlock: {
    marginTop: SPACING[24],
  },
  skeletonStack: {
    marginTop: SPACING[24],
    gap: SPACING[12],
  },
  balanceCard: {
    marginTop: SPACING[24],
  },
  uppercase: {
    textTransform: "uppercase",
  },
  balanceAmount: {
    marginTop: SPACING[8],
  },
  statRow: {
    flexDirection: "row",
    gap: SPACING[12],
    marginTop: SPACING[16],
  },
  statChip: {
    flex: 1,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.card,
    padding: SPACING[12],
  },
  statValue: {
    marginTop: SPACING[4],
    fontFamily: "Inter_600SemiBold",
  },
  section: {
    marginTop: SPACING[24],
  },
  sectionHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textButton: {
    minHeight: 44,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING[16],
  },
  accentText: {
    color: COLORS.accent,
    fontFamily: "Inter_600SemiBold",
  },
  emptyCard: {
    marginTop: SPACING[12],
  },
  budgetScroll: {
    paddingTop: SPACING[12],
    paddingRight: SPACING[24],
  },
  budgetGap: {
    marginRight: SPACING[12],
  },
  budgetTile: {
    width: 192,
  },
  progressTrack: {
    height: 4,
    marginTop: SPACING[16],
    overflow: "hidden",
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.stroke,
  },
  progressFill: {
    height: 4,
    borderRadius: RADIUS.pill,
  },
  transactionStack: {
    marginTop: SPACING[12],
    gap: SPACING[8],
  },
  semibold: {
    fontFamily: "Inter_600SemiBold",
  },
  mt4: {
    marginTop: SPACING[4],
  },
  mt12: {
    marginTop: SPACING[12],
  },
});
