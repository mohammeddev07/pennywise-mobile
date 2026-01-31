import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { useCategoriesStore, type Category } from "@/features/categories/store";
import { useTransactionsStore } from "@/features/transactions/store";

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();

  const categories = useCategoriesStore((s) => s.categories);
  const transactions = useTransactionsStore((s) => s.transactions);

  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      const c = String((tx as any).category ?? "Uncategorized");
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return map;
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 10 }}>
      <View className="px-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-text text-2xl font-semibold">Categories</Text>

          <Pressable
            onPress={() => router.push("/modals/category-editor")}
            className="h-11 w-11 items-center justify-center rounded-full border border-stroke bg-surface"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="add" size={22} color={tokens.colors.accent} />
          </Pressable>
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
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery("")}
              className="h-9 w-9 items-center justify-center rounded-full"
              android_ripple={{ color: "#FFFFFF10", borderless: true }}
            >
              <Ionicons name="close" size={18} color={tokens.colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <View className="h-px bg-stroke mt-5" />
      </View>

      <View className="flex-1 px-6">
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <CategoryCard
              item={item}
              count={counts.get(item.name) ?? 0}
              onPress={() =>
                router.push({
                  pathname: "/modals/category-editor",
                  params: { id: item.id }
                })
              }
            />
          )}
          contentContainerStyle={{
            paddingBottom: (insets.bottom || 0) + 22,
            paddingTop: 14
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

function CategoryCard({
  item,
  count,
  onPress
}: {
  item: Category;
  count: number;
  onPress: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={onPress}
        className="mr-3 mb-3 rounded-3xl border border-stroke bg-surface p-4"
        android_ripple={{ color: "#FFFFFF10" }}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      >
        <View className="flex-row items-center justify-between">
          <View
            className="h-11 w-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${item.color}22` }}
          >
            <Ionicons name={item.icon as any} size={20} color={item.color} />
          </View>

          <View className="rounded-full border border-stroke px-3 py-1">
            <Text className="text-muted text-xs font-semibold">{count}</Text>
          </View>
        </View>

        <Text className="text-text text-base font-semibold mt-3">{item.name}</Text>
        <Text className="text-muted text-xs mt-1">Tap to edit</Text>
      </Pressable>
    </View>
  );
}
