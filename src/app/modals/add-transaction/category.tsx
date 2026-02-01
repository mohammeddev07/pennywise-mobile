import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { useCategoriesStore } from "@/features/categories/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";

type CatMeta = {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
  cents: number;
  lastAt: number;
};

function safeTime(iso?: string) {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function formatMoney0(cents: number) {
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(0);
  const intWithSep = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${intWithSep}`;
}

function CatPill({
  item,
  active,
  onPress,
}: {
  item: CatMeta;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mr-3 rounded-full border border-stroke bg-surface px-4 py-2 flex-row items-center"
      android_ripple={{ color: "#FFFFFF10", borderless: true }}
      style={({ pressed }) => ({
        opacity: pressed ? 0.78 : 1,
        borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
        backgroundColor: active ? "#00C80514" : tokens.colors.surface,
      })}
    >
      <View
        className="h-7 w-7 items-center justify-center rounded-full border border-stroke"
        style={{ backgroundColor: `${item.color}22` }}
      >
        <Ionicons name={item.icon as any} size={14} color={item.color} />
      </View>
      <Text className="text-text font-semibold ml-2" numberOfLines={1}>
        {item.name}
      </Text>
    </Pressable>
  );
}

function CatCard({
  item,
  active,
  onPress,
}: {
  item: CatMeta;
  active: boolean;
  onPress: () => void;
}) {
  const activity = item.count > 0 ? `${item.count} tx • ${formatMoney0(item.cents)}` : "No activity yet";

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "#FFFFFF10" }}
      style={({ pressed }) => ({
        opacity: pressed ? 0.78 : 1,
      })}
    >
      <View
        style={{
          borderRadius: 24,
          borderWidth: 1,
          borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
          backgroundColor: active ? "#00C80514" : tokens.colors.surface,
          padding: 14,
          minHeight: 112,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View
            className="h-10 w-10 items-center justify-center rounded-2xl border border-stroke"
            style={{ backgroundColor: `${item.color}22` }}
          >
            <Ionicons name={item.icon as any} size={18} color={item.color} />
          </View>

          {active ? (
            <View
              className="h-8 w-8 items-center justify-center rounded-full border"
              style={{ borderColor: `${tokens.colors.accent}55`, backgroundColor: "#00C80518" }}
            >
              <Ionicons name="checkmark" size={16} color={tokens.colors.accent} />
            </View>
          ) : null}
        </View>

        <Text className="text-text font-semibold mt-3" numberOfLines={1}>
          {item.name}
        </Text>

        <Text className="text-muted text-xs mt-1" numberOfLines={1}>
          {activity}
        </Text>
      </View>
    </Pressable>
  );
}

export default function AddTransactionCategory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const categories = useCategoriesStore((s) => s.categories);
  const transactions = useTransactionsStore((s) => s.transactions);

  const selected = useAddTransactionDraftStore((s) => s.category);
  const setCategory = useAddTransactionDraftStore((s) => s.setCategory);
  const bookId = useAddTransactionDraftStore((s) => s.bookId);
  const kind = useAddTransactionDraftStore((s) => s.kind);

  const [query, setQuery] = useState("");

  const allCats = useMemo(() => {
    const base: CatMeta[] = [
      {
        id: "uncat",
        name: "Uncategorized",
        icon: "pricetag-outline",
        color: tokens.colors.muted,
        count: 0,
        cents: 0,
        lastAt: 0,
      },
      ...categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        count: 0,
        cents: 0,
        lastAt: 0,
      })),
    ];

    const map = new Map<string, CatMeta>();
    for (const c of base) map.set(c.name, c);

    for (const tx of transactions) {
      if (tx.bookId !== bookId) continue;
      if (tx.kind !== kind) continue;

      const name = tx.category || "Uncategorized";
      let row = map.get(name);

      if (!row) {
        row = {
          id: `ghost_${name}`,
          name,
          icon: "pricetag-outline",
          color: tokens.colors.muted,
          count: 0,
          cents: 0,
          lastAt: 0,
        };
        map.set(name, row);
      }

      row.count += 1;
      row.cents += tx.amountCents;
      row.lastAt = Math.max(row.lastAt, safeTime(tx.occurredAt));
    }

    return Array.from(map.values());
  }, [categories, transactions, bookId, kind]);

  const recent = useMemo(() => {
    return allCats
      .filter((c) => c.count > 0)
      .sort((a, b) => b.lastAt - a.lastAt)
      .slice(0, 8);
  }, [allCats]);

  const gridData = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? allCats.filter((c) => c.name.toLowerCase().includes(q)) : allCats;

    const used = filtered
      .filter((c) => c.count > 0)
      .sort((a, b) => (b.cents !== a.cents ? b.cents - a.cents : b.count - a.count));

    const unused = filtered
      .filter((c) => c.count === 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    return [...used, ...unused];
  }, [allCats, query]);

  const choose = (name: string) => {
    Haptics.selectionAsync().catch(() => {});
    setCategory(name);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  const GUTTER = 12;
  const HALF = GUTTER / 2;

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top + 10 }}>
      {/* Header */}
      <View className="px-6 flex-row items-center justify-between">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            router.back();
          }}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </Pressable>

        <View className="items-center">
          <Text className="text-text text-base font-semibold">Category</Text>
          <Text className="text-muted text-xs mt-1">{kind === "expense" ? "Expense" : "Income"} • Book-aware</Text>
        </View>

        <View className="h-12 w-12" />
      </View>

      {/* Search + Recent */}
      <View className="px-6 mt-5">
        <View className="flex-row items-center rounded-2xl border border-stroke bg-surface px-4 py-3">
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
            <Pressable
              onPress={() => setQuery("")}
              className="h-9 w-9 items-center justify-center rounded-full"
              android_ripple={{ color: "#FFFFFF10", borderless: true }}
            >
              <Ionicons name="close" size={18} color={tokens.colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {query.trim().length === 0 && recent.length > 0 ? (
          <View className="mt-5">
            <Text className="text-muted text-xs uppercase tracking-widest mb-3">Recent</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recent.map((c) => (
                <CatPill key={`recent_${c.id}_${c.name}`} item={c} active={c.name === selected} onPress={() => choose(c.name)} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View className="h-px bg-stroke mt-5" />
      </View>

      {/* Grid */}
      <View className="flex-1 px-6">
        <FlashList
          data={gridData}
          keyExtractor={(c) => `${c.id}_${c.name}`}
          numColumns={2}
          renderItem={({ item, index }) => {
            const isLeft = index % 2 === 0;

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
                <CatCard item={item} active={item.name === selected} onPress={() => choose(item.name)} />
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 24, paddingTop: 6 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="py-14 items-center">
              <Text className="text-muted">No categories found.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}
