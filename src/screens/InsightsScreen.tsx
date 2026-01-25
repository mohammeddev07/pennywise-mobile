import React, { useMemo, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useColorScheme } from "nativewind";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "../components/Screen";
import { SegmentedControl } from "../components/SegmentedControl";
import { TipCard } from "../components/TipCard";
import { ProgressBar } from "../components/ProgressBar";
import { qk } from "../api/queryKeys";
import { getSummary } from "../api/mockApi";
import { useAppStore } from "../state/appStore";
import { formatMoneyFromMinor } from "../utils/currency";

type Period = "weekly" | "monthly" | "yearly";

export function InsightsScreen() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const bookId = useAppStore((s) => s.selectedBookId)!;

    const [period, setPeriod] = useState<Period>("monthly");

    const summaryQ = useQuery({ queryKey: qk.balance(bookId), queryFn: () => getSummary(bookId) });
    const currencyCode = "USD";

    const totalSpending = useMemo(() => {
        // UI-first: mirror screenshot “$2,450.00”
        return formatMoneyFromMinor(245000, currencyCode);
    }, [currencyCode]);

    const headerText = isDark ? "text-white" : "text-textLight";
    const mutedText = isDark ? "text-textSecondary" : "text-textMutedLight";

    return (
        <Screen>
            <ScrollView contentContainerStyle={{ paddingBottom: 140 }} className="px-5 pt-10">
                <Text className={`text-sm font-medium ${mutedText}`}>Total spending</Text>
                <Text className={`mt-1 text-3xl font-bold ${headerText}`}>{totalSpending}</Text>

                <View className="mt-5">
                    <SegmentedControl
                        options={[
                            { label: "Weekly", value: "weekly" },
                            { label: "Monthly", value: "monthly" },
                            { label: "Yearly", value: "yearly" }
                        ]}
                        value={period}
                        onChange={setPeriod}
                    />
                </View>

                {/* Spending trends card (UI placeholder matching layout) */}
                <View className={`mt-6 rounded-2xl p-4 ${isDark ? "bg-cardDark border border-gray-700/50" : "bg-white shadow-sm"}`}>
                    <View className="flex-row items-start justify-between">
                        <View>
                            <Text className={`text-base font-bold ${headerText}`}>Spending Trends</Text>
                            <Text className={`mt-1 text-xs ${mutedText}`}>Last 7 days</Text>
                        </View>

                        <View className={`rounded-full px-3 py-1 ${isDark ? "bg-emerald-900/30" : "bg-emerald-50"}`}>
                            <Text className={`text-xs font-semibold ${isDark ? "text-emerald-300" : "text-emerald-600"}`}>+15% vs last month</Text>
                        </View>
                    </View>

                    {/* Chart placeholder area */}
                    <View className={`mt-4 h-36 w-full rounded-xl ${isDark ? "bg-white/5" : "bg-black/5"}`} />
                    <View className="mt-3 flex-row justify-between">
                        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                            <Text key={`${d}-${i}`} className={`text-xs ${mutedText}`}>
                                {d}
                            </Text>
                        ))}

                    </View>
                </View>

                <View className="mt-6">
                    <TipCard
                        title="Tip"
                        body="Set a weekly limit for Dining Out to reduce impulsive spending."
                    />
                </View>

                {/* Category breakdown */}
                <View className="mt-6">
                    <Text className={`text-base font-bold ${headerText}`}>Category breakdown</Text>

                    <View className="mt-3 gap-3">
                        {[
                            { name: "Rent", amountMinor: 120000, pct: 0.62 },
                            { name: "Food", amountMinor: 45000, pct: 0.23 },
                            { name: "Transport", amountMinor: 20000, pct: 0.10 },
                            { name: "Entertainment", amountMinor: 10000, pct: 0.05 }
                        ].map((c) => (
                            <View key={c.name} className={`rounded-2xl p-4 ${isDark ? "bg-cardDark border border-gray-700/50" : "bg-white shadow-sm"}`}>
                                <View className="flex-row items-center justify-between">
                                    <Text className={`text-sm font-semibold ${headerText}`}>{c.name}</Text>
                                    <Text className={`text-sm font-bold ${headerText}`}>{formatMoneyFromMinor(c.amountMinor, currencyCode)}</Text>
                                </View>
                                <View className="mt-3">
                                    <ProgressBar value={c.pct} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Just to keep React Query used in this screen during UI build */}
                <Text className="mt-6 text-[10px] opacity-0">{String(summaryQ.data?.balanceMinor ?? "")}</Text>
            </ScrollView>
        </Screen>
    );
}
