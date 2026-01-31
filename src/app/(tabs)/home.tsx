import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { isSameDay, parseISO } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { useTransactionsStore, type Transaction } from "@/features/transactions/store";
import { TransactionRow } from "@/shared/ui/components/TransactionRow";

function formatMoney(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(2);
  const [i, d] = dollars.split(".");
  const intWithSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${intWithSep}.${d}`;
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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const transactions = useTransactionsStore((s) => s.transactions);

  const { netCents, todayDeltaCents } = useMemo(() => {
    let net = 0;
    let today = 0;
    const now = new Date();

    for (const tx of transactions) {
      const signed = tx.kind === "income" ? tx.amountCents : -tx.amountCents;
      net += signed;

      const d = safeDate(tx.occurredAt);
      if (d && isSameDay(d, now)) today += signed;
    }

    return { netCents: net, todayDeltaCents: today };
  }, [transactions]);

  const isUp = todayDeltaCents >= 0;

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 10 }}>
      {/* Header */}
      <View className="px-6">
        <View className="flex-row items-center justify-between">
          <Pressable className="flex-row items-center" onPress={() => router.push("/modals/book-switcher")}>
            <View>
              <Text className="text-text text-2xl font-semibold">Personal</Text>
              <Text className="text-muted mt-1">CashBook Pro</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={tokens.colors.accent} style={{ marginLeft: 10 }} />
          </Pressable>

          <Pressable
            className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
            onPress={() => {}}
          >
            <Ionicons name="notifications-outline" size={20} color={tokens.colors.text} />
          </Pressable>
        </View>

        {/* Hero */}
        <View className="items-center mt-10">
          <Text className="text-muted text-sm tracking-widest">NET BALANCE</Text>
          <Text className="text-text text-6xl font-semibold mt-3">{formatMoney(netCents)}</Text>

          <View className="flex-row items-center mt-2">
            <Ionicons name={isUp ? "trending-up" : "trending-down"} size={16} color={tokens.colors.accent} />
            <Text className="ml-2" style={{ color: tokens.colors.accent }}>
              {todayDeltaCents >= 0 ? "+" : ""}
              {formatMoney(todayDeltaCents)} (Today)
            </Text>
          </View>
        </View>

        {/* Recent Activity header */}
        <View className="flex-row items-center justify-between mt-10">
          <Text className="text-text text-2xl font-semibold">Recent Activity</Text>
          <Pressable onPress={() => router.push("/(tabs)/transactions")}>
            <Text style={{ color: tokens.colors.accent }} className="text-sm font-semibold">
              SEE ALL
            </Text>
          </Pressable>
        </View>
        <View className="h-px bg-stroke mt-4" />
      </View>

      {/* Activity list */}
      <View className="flex-1 px-6">
        <FlashList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionRow item={item} />}
          ItemSeparatorComponent={() => <View className="h-px bg-stroke" />}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/modals/add-transaction")}
        className="absolute self-center items-center justify-center rounded-full"
        style={{
          bottom: (insets.bottom || 0) + 22,
          width: 72,
          height: 72,
          backgroundColor: tokens.colors.accent,
        }}
        android_ripple={{ color: "#00000022", borderless: true }}
      >
        <Ionicons name="add" size={34} color="#000000" />
      </Pressable>
    </View>
  );
}
