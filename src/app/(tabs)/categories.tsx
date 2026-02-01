import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Circle } from "react-native-svg";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { useCategoriesStore, type Category } from "@/features/categories/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useBooksStore } from "@/features/books/store";
import { useBudgetsStore } from "@/features/budgets/store";

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

function formatMoney0(cents: number) {
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(0);
  const intWithSep = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${intWithSep}`;
}

function Ring({
  size,
  stroke,
  progress,
  color,
}: {
  size: number;
  stroke: number;
  progress: number; // 0..1
  color: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const dash = c * p;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={tokens.colors.stroke}
        strokeWidth={stroke}
        fill="transparent"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="transparent"
        strokeDasharray={`${dash} ${c - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

type BudgetTile = {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  spentCents: number;
  budgetCents: number;
};

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();

  const categories = useCategoriesStore((s) => s.categories);
  const transactions = useTransactionsStore((s) => s.transactions);

  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const budgets = useBudgetsStore((s) => s.budgets);

  const [query, setQuery] = useState("");

  const tiles = useMemo<BudgetTile[]>(() => {
    const bookId = selectedBookId ?? "personal";
    const month = nowMonthKey();

    const budgetByCat = new Map<string, number>();
    for (const b of budgets) {
      if ((b.bookId ?? "personal") !== bookId) continue;
      const cat = String(b.category ?? "");
      const cents = Number(b.budgetCents ?? 0) || 0;
      if (!cat) continue;
      budgetByCat.set(cat, cents);
    }

    const spentByCat = new Map<string, number>();
    for (const tx of transactions as any[]) {
      // tolerate old data that lacks bookId
      if (tx.bookId && tx.bookId !== bookId) continue;
      if (tx.kind !== "expense") continue;
      if (monthKey(tx.occurredAt) !== month) continue;

      const cat = String(tx.category ?? "Uncategorized");
      const cents = Math.abs(Number(tx.amountCents ?? 0) || 0);
      spentByCat.set(cat, (spentByCat.get(cat) ?? 0) + cents);
    }

    const out: BudgetTile[] = categories.map((c) => ({
      id: c.id,
      categoryId: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      spentCents: spentByCat.get(c.name) ?? 0,
      budgetCents: budgetByCat.get(c.name) ?? 0,
    }));

    // If Uncategorized exists via spending but not in categories list
    if (!out.some((x) => x.name === "Uncategorized") && spentByCat.has("Uncategorized")) {
      out.unshift({
        id: "uncat",
        categoryId: "uncat",
        name: "Uncategorized",
        icon: "pricetag-outline",
        color: tokens.colors.muted,
        spentCents: spentByCat.get("Uncategorized") ?? 0,
        budgetCents: budgetByCat.get("Uncategorized") ?? 0,
      });
    }

    const q = query.trim().toLowerCase();
    return q ? out.filter((t) => t.name.toLowerCase().includes(q)) : out;
  }, [budgets, categories, query, selectedBookId, transactions]);

  const GUTTER = 12;
  const HALF = GUTTER / 2;

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 10 }}>
      <View className="px-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-text text-2xl font-semibold">Categories</Text>

          <HapticPressable
            onPress={() => router.push("/modals/category-editor")}
            haptic="selection"
            pressScale={0.98}
            className="h-11 w-11 items-center justify-center rounded-full border border-stroke bg-surface"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="add" size={22} color={tokens.colors.accent} />
          </HapticPressable>
        </View>

        {/* Search */}
        <View className="mt-5 flex-row items-center rounded-2xl border border-stroke bg-surface px-4 py-3">
          <Ionicons name="search" size={18} color={tokens.colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search categories…"
            placeholderTextColor={tokens.colors.muted}
            className="ml-3 flex-1 text-text"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 ? (
            <HapticPressable
              onPress={() => setQuery("")}
              haptic="selection"
              pressScale={0.98}
              className="h-9 w-9 items-center justify-center rounded-full"
              android_ripple={{ color: "#FFFFFF10", borderless: true }}
            >
              <Ionicons name="close" size={18} color={tokens.colors.muted} />
            </HapticPressable>
          ) : null}
        </View>

        <View className="h-px bg-stroke mt-5" />
      </View>

      <View className="flex-1 px-6">
        <FlashList
          data={tiles}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item, index }) => {
            const isLeft = index % 2 === 0;

            const remaining = item.budgetCents - item.spentCents;
            const over = item.budgetCents > 0 && remaining < 0;

            const ringColor = over ? tokens.colors.danger : tokens.colors.accent;
            const progress =
              item.budgetCents > 0 ? Math.min(1, item.spentCents / Math.max(1, item.budgetCents)) : 0;

            return (
              <View
                style={{
                  flex: 1,
                  paddingLeft: isLeft ? 0 : HALF,
                  paddingRight: isLeft ? HALF : 0,
                  paddingBottom: GUTTER,
                  paddingTop: 12,
                }}
              >
                <HapticPressable
                  onPress={() =>
                    router.push({
                      pathname: "/modals/category-editor",
                      params: { id: item.categoryId },
                    })
                  }
                  haptic="selection"
                  pressScale={0.98}
                  className="rounded-[28px] border border-stroke bg-surface"
                  android_ripple={{ color: "#FFFFFF10" }}
                  style={{ padding: 16, minHeight: 210 }}
                >
                  {/* top row */}
                  <View className="flex-row items-center justify-between">
                    <View
                      className="h-10 w-10 items-center justify-center rounded-full border border-stroke"
                      style={{ backgroundColor: `${item.color}22` }}
                    >
                      <Ionicons name={item.icon as any} size={18} color={item.color} />
                    </View>

                    <Ionicons name="create-outline" size={18} color={tokens.colors.muted} />
                  </View>

                  {/* ring */}
                  <View style={{ marginTop: 14, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: 110, height: 110, alignItems: "center", justifyContent: "center" }}>
                      <Ring size={110} stroke={10} progress={progress} color={ringColor} />

                      {/* INSIDE CIRCLE: OVER/LEFT */}
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
                        {item.budgetCents > 0 ? (
                          <>
                            <Text className="text-muted text-xs tracking-widest">{over ? "OVER" : "LEFT"}</Text>
                            <Text style={{ color: ringColor, fontWeight: "900", marginTop: 6 }}>
                              {formatMoney0(Math.abs(remaining))}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text className="text-muted text-xs tracking-widest">BUDGET</Text>
                            <Text style={{ color: tokens.colors.muted, fontWeight: "900", marginTop: 6 }}>
                              Set
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* BIG centered label under ring */}
                  <View style={{ marginTop: 14, alignItems: "center" }}>
                    <Text className="text-text text-base font-semibold" numberOfLines={1}>
                      {item.name}
                    </Text>

                    <Text className="text-text text-2xl font-semibold mt-2">
                      {formatMoney0(item.spentCents)}
                    </Text>

                    <Text className="text-muted text-xs mt-1">
                      {item.budgetCents > 0 ? `of ${formatMoney0(item.budgetCents)} budget` : "Tap to set budget"}
                    </Text>
                  </View>
                </HapticPressable>
              </View>
            );
          }}
          contentContainerStyle={{
            paddingBottom: (insets.bottom || 0) + 22,
            paddingTop: 6,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-10 items-center">
              <Text className="text-muted">No categories found.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}
