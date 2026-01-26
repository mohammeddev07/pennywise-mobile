import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "../components/Screen";
import { BalanceCard } from "../components/BalanceCard";
import { OverviewCard } from "../components/OverviewCard";
import { TransactionRow } from "../components/TransactionRow";
import { formatDashboardDate } from "../utils/date";
import { formatMoneyFromMinor } from "../utils/currency";
import { useAppStore } from "../state/appStore";
import { qk } from "../api/queryKeys";
import { getSummary, listTransactions } from "../api/mockApi";

export function HomeScreen({ navigation }: any) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const bookId = useAppStore((s) => s.selectedBookId)!;

  const summaryQ = useQuery({ queryKey: qk.balance(bookId), queryFn: () => getSummary(bookId) });
  const txQ = useQuery({ queryKey: qk.transactions(bookId), queryFn: () => listTransactions(bookId) });

  const [refreshing, setRefreshing] = useState(false);

  const dateText = useMemo(() => formatDashboardDate(new Date()), []);
  const greeting = "Good Morning, Alex";

  const currencyCode = "USD";
  const balanceText = formatMoneyFromMinor(summaryQ.data?.balanceMinor ?? 1245000, currencyCode);

  const recent = txQ.data?.page.items ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([summaryQ.refetch(), txQ.refetch()]);
    setRefreshing(false);
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        stickyHeaderIndices={[0]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#10b981" : "#2b4bee"} />}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Sticky header */}
        <View className={`${isDark ? "bg-backgroundDark/90" : "bg-backgroundLight/90"} px-5 pb-4 pt-10`}>
          <View className="flex-row items-center justify-between">
            <View className="flex-col">
              <Text className={`text-sm font-medium ${isDark ? "text-textSecondary" : "text-textMutedLight"}`}>{dateText}</Text>
              <Text className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-textLight"}`}>{greeting}</Text>
            </View>

            <Pressable
              className={`relative h-10 w-10 items-center justify-center rounded-full ${isDark ? "bg-cardDark border border-gray-700" : "bg-white border border-gray-100"} shadow-sm`}
              android_ripple={{ color: isDark ? "#ffffff10" : "#00000010", borderless: true }}
            >
              <MaterialIcons name="notifications" size={22} color={isDark ? "#fff" : "#111218"} />
              <View className={`absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ${isDark ? "border-2 border-cardDark" : "border-2 border-white"}`} />
            </Pressable>
          </View>
        </View>

        <BalanceCard
          balanceLabel="Total Balance"
          balanceText={balanceText}
          deltaText="+12.5%"
          deltaCaption={isDark ? "vs last month" : "vs last month"}
        />

        {/* Overview */}
        <View className="mt-6">
          <View className="px-5 pb-3">
            <Text className={`text-base font-bold ${isDark ? "text-white" : "text-textLight"}`}>Overview</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5" contentContainerStyle={{ gap: 16, paddingBottom: 8 }}>
            <OverviewCard
              icon="credit-card"
              iconBgClass={isDark ? "bg-orange-900/30 border border-orange-500/20" : "bg-orange-100"}
              iconColor={isDark ? "#fb923c" : "#ea580c"}
              label="Spending"
              value="$2,300"
              trendText="5%"
              trendUp={false}
            />
            <OverviewCard
              icon="savings"
              iconBgClass={isDark ? "bg-emerald-900/30 border border-emerald-500/20" : "bg-emerald-100"}
              iconColor={isDark ? "#34d399" : "#059669"}
              label="Savings"
              value="$5,000"
              trendText="12%"
              trendUp
            />
            <OverviewCard
              icon="trending-up"
              iconBgClass={isDark ? "bg-purple-900/30 border border-purple-500/20" : "bg-purple-100"}
              iconColor={isDark ? "#c084fc" : "#7c3aed"}
              label="Portfolio"
              value="$8,120"
              trendText="2%"
              trendUp
            />
          </ScrollView>
        </View>

        {/* Recent Activity */}
        <View className="mt-6 px-5">
          <View className="flex-row items-center justify-between pb-4">
            <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-textLight"}`}>Recent Activity</Text>
            <Pressable>
              <Text className={`text-sm font-semibold ${isDark ? "text-primary" : "text-primaryLight"}`}>See All</Text>
            </Pressable>
          </View>

          <View className="gap-3">
            {recent.map((tx) => {
              const sign = tx.type === "INCOME" ? "+" : "-";
              const amtText = `${sign}${formatMoneyFromMinor(tx.amountMinor, currencyCode)}`;
              const subtitle = `${tx.category.name} • ${tx.occurredOn}`;
              return (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  subtitle={subtitle}
                  amountText={amtText}
                  onPress={() => navigation.getParent()?.navigate("EditTransaction", { txId: tx.id })}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
