import { useMemo } from "react";
import { Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/shared/ui/theme/tokens";
import { BookPill } from "@/shared/ui/components/BookPill";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { RingProgress } from "@/shared/ui/components/RingProgress";
import { useBooksStore } from "@/features/books/store";
import { useCategoriesStore } from "@/features/categories/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useBudgetsStore } from "@/features/budgets/store";

function formatMoney(cents: number) {
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(0);
  const intWithSep = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${intWithSep}`;
}

type Card = {
  key: string;
  name: string;
  icon: string;
  color: string;
  spentCents: number;
  budgetCents: number | null;
};

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const categories = useCategoriesStore((s) => s.categories);
  const txs = useTransactionsStore((s) => s.transactions);

  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const books = useBooksStore((s) => s.books);

  const getBudgetCents = useBudgetsStore((s) => s.getBudgetCents);

  const selectedBookName = useMemo(() => {
    return books.find((b) => b.id === selectedBookId)?.name ?? "Personal";
  }, [books, selectedBookId]);

  const cards = useMemo<Card[]>(() => {
    const list = [
      { id: "uncat", name: "Uncategorized", icon: "pricetag-outline", color: "#94A3B8" },
      ...categories.map((c: any) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color })),
    ];

    const spendByCat = new Map<string, number>();
    for (const t of txs) {
      if (t.bookId !== selectedBookId) continue;
      if (t.kind !== "expense") continue;
      const name = (t.category || "Uncategorized").trim() || "Uncategorized";
      spendByCat.set(name, (spendByCat.get(name) ?? 0) + t.amountCents);
    }

    return list
      .map((c: any) => {
        const spent = spendByCat.get(c.name) ?? 0;
        const budget = getBudgetCents(selectedBookId, c.name);
        return {
          key: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          spentCents: spent,
          budgetCents: budget,
        };
      })
      .sort((a, b) => (b.spentCents !== a.spentCents ? b.spentCents - a.spentCents : a.name.localeCompare(b.name)));
  }, [categories, getBudgetCents, selectedBookId, txs]);

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 10 }}>
      {/* Header */}
      <View className="px-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-text text-2xl font-semibold">Categories</Text>

          <View className="flex-row items-center">
            <BookPill label={selectedBookName} onPress={() => router.push("/modals/book-switcher")} />
            <HapticPressable
              onPress={() => router.push("/modals/category-editor")}
              className="ml-3 h-11 w-11 items-center justify-center rounded-full border border-stroke bg-surface"
              android_ripple={{ color: "#FFFFFF12", borderless: true }}
            >
              <Ionicons name="add" size={22} color={tokens.colors.accent} />
            </HapticPressable>
          </View>
        </View>

        <View className="h-px bg-stroke mt-5" />
      </View>

      {/* Grid */}
      <View className="flex-1 px-6">
        <FlashList
          data={cards}
          keyExtractor={(c) => c.key}
          numColumns={2}
          renderItem={({ item }) => {
            const budget = item.budgetCents;
            const spent = item.spentCents;

            const hasBudget = typeof budget === "number" && budget > 0;
            const remaining = hasBudget ? budget! - spent : 0;
            const over = hasBudget ? remaining < 0 : false;

            const ringColor = over ? tokens.colors.danger : tokens.colors.accent;
            const progress = hasBudget ? Math.min(1, spent / Math.max(1, budget!)) : 0;

            return (
              <View style={{ flex: 1, padding: 6 }}>
                <HapticPressable
                  onPress={() => {
                    if (item.key === "uncat") return;
                    router.push({ pathname: "/modals/category-editor", params: { id: item.key } });
                  }}
                  className="rounded-[28px] border border-stroke bg-surface overflow-hidden"
                  android_ripple={{ color: "#FFFFFF10" }}
                  style={{ padding: 16, minHeight: 178 }}
                >
                  <View className="flex-row items-center justify-between">
                    <View
                      className="h-10 w-10 items-center justify-center rounded-full border border-stroke"
                      style={{ backgroundColor: `${item.color}22` }}
                    >
                      <Ionicons name={item.icon as any} size={18} color={item.color} />
                    </View>

                    <HapticPressable
                      onPress={() =>
                        router.push({ pathname: "/modals/budget-editor", params: { category: item.name } })
                      }
                      pressScale={0.99}
                      className="h-10 w-10 items-center justify-center rounded-full"
                      android_ripple={{ color: "#FFFFFF10", borderless: true }}
                    >
                      <Ionicons name="ellipsis-horizontal" size={16} color={tokens.colors.muted} />
                    </HapticPressable>
                  </View>

                  <View className="mt-5">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-text font-semibold" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text className="text-muted text-xs">{formatMoney(spent)}</Text>
                    </View>

                    {/* Budget ring */}
                    <View className="mt-4 flex-row items-center">
                      <RingProgress size={74} stroke={9} progress={hasBudget ? progress : 0.15} color={ringColor} />

                      <View className="ml-4 flex-1">
                        {hasBudget ? (
                          <>
                            <Text className="text-muted text-xs tracking-widest">{over ? "OVER" : "LEFT"}</Text>
                            <Text
                              className="text-lg font-semibold mt-1"
                              style={{ color: over ? tokens.colors.danger : tokens.colors.accent }}
                            >
                              {formatMoney(Math.abs(remaining))}
                            </Text>
                            <Text className="text-muted text-xs mt-1">
                              {formatMoney(spent)} / {formatMoney(budget!)}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text className="text-muted text-xs tracking-widest">BUDGET</Text>
                            <Text className="text-text text-lg font-semibold mt-1">Not set</Text>
                            <Text className="text-muted text-xs mt-1">Tap ••• to set a budget</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                </HapticPressable>
              </View>
            );
          }}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: (insets.bottom || 0) + 24 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}
