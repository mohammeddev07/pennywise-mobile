import { useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, LinearGradient as SvgLG, Stop, Path } from "react-native-svg";

import { tokens } from "@/shared/ui/theme/tokens";

type Period = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

type ActivityItem = {
  id: string;
  title: string;
  category: string;
  amount: number; // +income / -expense
  dateLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const PERIODS: Period[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "1", title: "Apple Store", category: "Electronics", amount: -899, dateLabel: "Today", icon: "bag-outline" },
  { id: "2", title: "Direct Deposit", category: "Salary", amount: 2450, dateLabel: "Yesterday", icon: "arrow-down-outline" },
  { id: "3", title: "Starbucks", category: "Food & Drink", amount: -14.5, dateLabel: "Yesterday", icon: "cafe-outline" },
  { id: "4", title: "Uber", category: "Transport", amount: -24.12, dateLabel: "Apr 12", icon: "car-outline" },
];

function money(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [period, setPeriod] = useState<Period>("1D");

  // Mock totals (we’ll wire to store/API later)
  const netBalance = 12450.0;
  const deltaToday = 842.2;
  const income = 4250.0;
  const spending = 1120.5;

  const header = useMemo(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return `${greeting}, Alex`;
  }, []);

  const openAdd = () => {
    // Step 4 will make this flow pixel-perfect Robinhood-like
    router.push("/modals/add-transaction");
  };

  const renderItem = ({ item }: ListRenderItemInfo<ActivityItem>) => {
    const positive = item.amount > 0;
    return (
      <Pressable
        className="flex-row items-center px-6 py-4"
        android_ripple={{ color: "#FFFFFF10" }}
        onPress={() => {}}
      >
        <View className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke">
          <Ionicons name={item.icon} size={20} color={tokens.colors.text} />
        </View>

        <View className="ml-4 flex-1">
          <Text style={{ fontFamily: "Inter_600SemiBold" }} className="text-text text-base">
            {item.title}
          </Text>
          <Text className="text-muted mt-0.5 text-sm">{item.category}</Text>
        </View>

        <View className="items-end">
          <Text
            style={{ fontFamily: "Inter_600SemiBold" }}
            className={`text-base ${positive ? "text-accent" : "text-text"}`}
          >
            {positive ? `+${money(item.amount).replace("-", "")}` : money(item.amount)}
          </Text>
          <Text className="text-muted mt-0.5 text-sm">{item.dateLabel}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-app">
      <FlashList
        data={MOCK_ACTIVITY}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View className="h-px bg-stroke mx-6 opacity-60" />}
        contentContainerStyle={{ paddingBottom: 160 }}
        ListHeaderComponent={
          <View>
            {/* Top bar */}
            <View className="px-6 pt-14">
              <View className="flex-row items-center justify-between">
                <Pressable
                  className="flex-row items-center"
                  android_ripple={{ color: "#FFFFFF10", borderless: true }}
                  onPress={() => router.push("/modals/book-switcher")}
                >
                  <View>
                    <Text style={{ fontFamily: "Inter_700Bold" }} className="text-text text-2xl">
                      Personal
                    </Text>
                    <Text className="text-muted mt-1">CashBook Pro</Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={tokens.colors.accent} style={{ marginLeft: 10, marginTop: 6 }} />
                </Pressable>

                <Pressable
                  className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
                  android_ripple={{ color: "#FFFFFF12", borderless: true }}
                  onPress={() => {}}
                >
                  <Ionicons name="notifications-outline" size={20} color={tokens.colors.text} />
                  <View className="absolute right-3 top-3 h-2 w-2 rounded-full bg-accent" />
                </Pressable>
              </View>
            </View>

            {/* Hero */}
            <View className="px-6 mt-10 items-center">
              <Text className="text-muted tracking-widest" style={{ fontFamily: "Inter_600SemiBold" }}>
                NET BALANCE
              </Text>

              <View className="mt-3 flex-row items-end">
                <Text style={{ fontFamily: "Inter_600SemiBold" }} className="text-text text-3xl mr-2">
                  $
                </Text>
                <Text style={{ fontFamily: "Inter_800ExtraBold" }} className="text-text text-6xl">
                  {netBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
                <Text style={{ fontFamily: "Inter_600SemiBold" }} className="text-muted text-3xl mb-1 ml-1">
                  .00
                </Text>
              </View>

              <View className="mt-3 flex-row items-center">
                <Ionicons name="trending-up-outline" size={16} color={tokens.colors.accent} />
                <Text style={{ fontFamily: "Inter_600SemiBold" }} className="text-accent ml-2">
                  +{money(deltaToday).replace("-", "")} (Today)
                </Text>
              </View>
            </View>

            {/* Chart-ish background (static, we’ll upgrade later) */}
            <View className="mt-6">
              <LinearGradient
                colors={["#00C80518", "#00C80500"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ height: 190, width }}
              />
              <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 190 }}>
                <Svg width={width} height={190}>
                  <Defs>
                    <SvgLG id="g" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#00C805" stopOpacity="0.25" />
                      <Stop offset="1" stopColor="#00C805" stopOpacity="0.0" />
                    </SvgLG>
                  </Defs>
                  {/* Line */}
                  <Path
                    d={`M 0 150 C ${width * 0.2} 130, ${width * 0.35} 160, ${width * 0.5} 110
                        C ${width * 0.65} 70, ${width * 0.8} 120, ${width} 60`}
                    fill="none"
                    stroke="#00C805"
                    strokeWidth={3}
                  />
                  {/* Fill */}
                  <Path
                    d={`M 0 150 C ${width * 0.2} 130, ${width * 0.35} 160, ${width * 0.5} 110
                        C ${width * 0.65} 70, ${width * 0.8} 120, ${width} 60
                        L ${width} 190 L 0 190 Z`}
                    fill="url(#g)"
                  />
                </Svg>
              </View>
            </View>

            {/* Period segmented */}
            <View className="px-6 mt-6">
              <View className="flex-row rounded-2xl bg-surface border border-stroke p-1">
                {PERIODS.map((p) => {
                  const active = p === period;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setPeriod(p)}
                      className={`flex-1 items-center justify-center py-2 rounded-xl ${
                        active ? "bg-card" : "bg-transparent"
                      }`}
                      android_ripple={{ color: "#FFFFFF10" }}
                    >
                      <Text
                        style={{ fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium" }}
                        className={`${active ? "text-text" : "text-muted"}`}
                      >
                        {p}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Metric cards */}
            <View className="px-6 mt-6 flex-row gap-4">
              <MetricCard
                title="Income"
                value={money(income)}
                accent="accent"
                progress={0.72}
              />
              <MetricCard
                title="Spending"
                value={money(spending)}
                accent="danger"
                progress={0.32}
              />
            </View>

            {/* Section header */}
            <View className="px-6 mt-8 flex-row items-end justify-between">
              <Text style={{ fontFamily: "Inter_700Bold" }} className="text-text text-2xl">
                Recent Activity
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/transactions")} android_ripple={{ color: "#FFFFFF10" }}>
                <Text style={{ fontFamily: "Inter_600SemiBold" }} className="text-accent">
                  SEE ALL
                </Text>
              </Pressable>
            </View>

            <View className="h-px bg-stroke mx-6 mt-4 opacity-60" />
          </View>
        }
      />

      {/* Floating Add Button (temp; Step 3/4 we’ll integrate into custom tab bar) */}
      <View className="absolute bottom-8 left-0 right-0 items-center">
        <Pressable
          onPress={openAdd}
          className="h-16 w-16 rounded-full bg-accent items-center justify-center"
          android_ripple={{ color: "#00000022", borderless: true }}
          style={{
            shadowColor: "#00C805",
            shadowOpacity: 0.35,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
          }}
        >
          <Ionicons name="add" size={30} color="#000000" />
        </Pressable>

        <Text className="text-muted mt-2" style={{ fontFamily: "Inter_500Medium" }}>
          {header}
        </Text>
      </View>
    </View>
  );
}

function MetricCard({
  title,
  value,
  accent,
  progress,
}: {
  title: string;
  value: string;
  accent: "accent" | "danger";
  progress: number; // 0..1
}) {
  const barColor = accent === "accent" ? "bg-accent" : "bg-danger";
  return (
    <View className="flex-1 rounded-2xl bg-surface border border-stroke p-4 overflow-hidden">
      <Text className="text-muted" style={{ fontFamily: "Inter_500Medium" }}>
        {title}
      </Text>
      <Text className="text-text mt-1 text-2xl" style={{ fontFamily: "Inter_700Bold" }}>
        {value}
      </Text>

      <View className="mt-4 h-2 rounded-full bg-stroke overflow-hidden">
        <View className={`h-full ${barColor}`} style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
      </View>
    </View>
  );
}
