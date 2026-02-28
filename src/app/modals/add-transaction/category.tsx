import { useEffect, useMemo, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect, useRouter } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { useCategoriesStore } from "@/features/categories/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";

import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Sheet } from "@/shared/ui/components/Sheet";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";

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
    <HapticPressable
      onPress={onPress}
      haptic="selection"
      pressScale={0.99}
      className="mr-3 h-11 px-4 rounded-full border bg-surface flex-row items-center"
      style={{
        borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
        backgroundColor: active ? `${tokens.colors.accent}14` : tokens.colors.surface,
      }}
      android_ripple={{ color: "#FFFFFF10", borderless: true }}
    >
      <View
        className="h-7 w-7 items-center justify-center rounded-full border border-stroke"
        style={{ backgroundColor: `${item.color}22` }}
      >
        <Ionicons name={item.icon as any} size={14} color={item.color} />
      </View>

      <AppText
        variant="sm"
        className="ml-2"
        style={{ fontFamily: "Inter_600SemiBold" }}
        numberOfLines={1}
      >
        {item.name}
      </AppText>
    </HapticPressable>
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
    <HapticPressable onPress={onPress} haptic="selection" pressScale={0.99} pressOpacity={0.92}>
      <Card
        variant="surface"
        padding={16}
        className="min-h-[112px]"
        style={{
          borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
          backgroundColor: active ? `${tokens.colors.accent}14` : tokens.colors.surface,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View
            className="h-10 w-10 items-center justify-center rounded-lg border border-stroke"
            style={{ backgroundColor: `${item.color}22` }}
          >
            <Ionicons name={item.icon as any} size={18} color={item.color} />
          </View>

          {active ? (
            <View
              className="h-8 w-8 items-center justify-center rounded-full border"
              style={{ borderColor: `${tokens.colors.accent}55`, backgroundColor: `${tokens.colors.accent}18` }}
            >
              <Ionicons name="checkmark" size={16} color={tokens.colors.accent} />
            </View>
          ) : null}
        </View>

        <AppText
          variant="base"
          className="mt-3"
          style={{ fontFamily: "Inter_600SemiBold" }}
          numberOfLines={1}
        >
          {item.name}
        </AppText>

        <AppText variant="sm" tone="muted" className="mt-1" numberOfLines={1}>
          {activity}
        </AppText>
      </Card>
    </HapticPressable>
  );
}

export default function AddTransactionCategory() {
  const router = useRouter();

  const categories = useCategoriesStore((s) => s.categories);
  const consumeLastCreatedCategoryName = useCategoriesStore((s) => s.consumeLastCreatedCategoryName);

  const transactions = useTransactionsStore((s) => s.transactions);

  const selected = useAddTransactionDraftStore((s) => s.category);
  const setCategory = useAddTransactionDraftStore((s) => s.setCategory);
  const bookId = useAddTransactionDraftStore((s) => s.bookId);
  const kind = useAddTransactionDraftStore((s) => s.kind);

  const [query, setQuery] = useState("");

  // Loading (persist hydration) – categories + transactions
  const catsPersist = (useCategoriesStore as any).persist;
  const txPersist = (useTransactionsStore as any).persist;

  const [hydratedCats, setHydratedCats] = useState<boolean>(() => {
    const has = catsPersist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });

  const [hydratedTx, setHydratedTx] = useState<boolean>(() => {
    const has = txPersist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });

  useEffect(() => {
    if (catsPersist?.onFinishHydration) {
      const unsub = catsPersist.onFinishHydration(() => setHydratedCats(true));
      if (catsPersist?.hasHydrated && !catsPersist.hasHydrated()) catsPersist?.rehydrate?.();
      return () => unsub?.();
    }
  }, [catsPersist]);

  useEffect(() => {
    if (txPersist?.onFinishHydration) {
      const unsub = txPersist.onFinishHydration(() => setHydratedTx(true));
      if (txPersist?.hasHydrated && !txPersist.hasHydrated()) txPersist?.rehydrate?.();
      return () => unsub?.();
    }
  }, [txPersist]);

  const hydrated = hydratedCats && hydratedTx;

  const choose = (name: string) => {
    setCategory(name);
    router.back();
  };

  // ✅ Create → auto-select bridge
  useFocusEffect(() => {
    const name = consumeLastCreatedCategoryName();
    if (name) choose(name);
  });

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

  // Contract spacing values only: gutter=8, half=4
  const GUTTER = 8;
  const HALF = 4;

  const goCreate = () => {
    router.push({ pathname: "/modals/category-editor", params: { origin: "add-transaction" } });
  };

  const retryHydrate = () => {
    catsPersist?.rehydrate?.();
    txPersist?.rehydrate?.();
  };

  return (
    <View className="flex-1 bg-ink">
      <Sheet
        tone="ink"
        className="flex-1"
        title="Category"
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        rightAction={
          <HapticPressable
            onPress={goCreate}
            haptic="selection"
            pressScale={0.98}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="add" size={20} color={tokens.colors.accent} />
          </HapticPressable>
        }
      >
        <View className="mt-2">
          <AppText variant="xs" tone="muted" className="text-center">
            {kind === "expense" ? "Expense" : "Income"} • Book-aware
          </AppText>
        </View>

        {/* Search (contract: h=56, radius=16, paddingX=16) */}
        <View className="mt-5">
          <View className="flex-row items-center h-14 px-4 rounded-lg border border-stroke bg-surface">
            <Ionicons name="search" size={18} color={tokens.colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search categories…"
              placeholderTextColor={tokens.colors.muted}
              className="ml-3 flex-1 text-text"
              autoCorrect={false}
              autoCapitalize="none"
              style={[tokens.typography.base as any]}
            />
            {query.length > 0 ? (
              <HapticPressable
                onPress={() => setQuery("")}
                haptic="selection"
                pressScale={0.98}
                className="h-11 w-11 items-center justify-center rounded-full"
                android_ripple={{ color: "#FFFFFF10", borderless: true }}
              >
                <Ionicons name="close" size={18} color={tokens.colors.muted} />
              </HapticPressable>
            ) : null}
          </View>

          {/* Recent */}
          {query.trim().length === 0 ? (
            <View className="mt-5">
              <AppText variant="xs" tone="muted" className="uppercase mb-3">
                Recent
              </AppText>

              {!hydrated ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row">
                    <View className="mr-3">
                      <Skeleton height={44} width={120} borderRadius={24} />
                    </View>
                    <View className="mr-3">
                      <Skeleton height={44} width={150} borderRadius={24} />
                    </View>
                    <View className="mr-3">
                      <Skeleton height={44} width={110} borderRadius={24} />
                    </View>
                  </View>
                </ScrollView>
              ) : recent.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View className="flex-row">
                    {recent.map((c) => (
                      <CatPill
                        key={`recent_${c.id}_${c.name}`}
                        item={c}
                        active={c.name === selected}
                        onPress={() => choose(c.name)}
                      />
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <AppText variant="sm" tone="muted">
                  No recent category usage yet.
                </AppText>
              )}
            </View>
          ) : null}

          <View className="h-px bg-stroke mt-5" />
        </View>

        {/* Grid */}
        <View className="flex-1 mt-4">
          {!hydrated ? (
            // Loading state: skeleton grid
            <View>
              <View className="flex-row" style={{ gap: GUTTER }}>
                <View style={{ flex: 1 }}>
                  <Skeleton height={112} borderRadius={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <Skeleton height={112} borderRadius={24} />
                </View>
              </View>
              <View className="mt-2 flex-row" style={{ gap: GUTTER }}>
                <View style={{ flex: 1 }}>
                  <Skeleton height={112} borderRadius={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <Skeleton height={112} borderRadius={24} />
                </View>
              </View>
              <View className="mt-2 flex-row" style={{ gap: GUTTER }}>
                <View style={{ flex: 1 }}>
                  <Skeleton height={112} borderRadius={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <Skeleton height={112} borderRadius={24} />
                </View>
              </View>

              <View className="mt-4">
                <HapticPressable onPress={retryHydrate} haptic="selection" className="py-2">
                  <AppText variant="sm" className="text-accent" style={{ fontFamily: "Inter_600SemiBold" }}>
                    Retry loading
                  </AppText>
                </HapticPressable>
              </View>
            </View>
          ) : (
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
                      paddingTop: 8,
                    }}
                  >
                    <CatCard item={item} active={item.name === selected} onPress={() => choose(item.name)} />
                  </View>
                );
              }}
              contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View className="py-14">
                  <EmptyState
                    title="No categories found"
                    message="Try a different search, or create a new category."
                    actionLabel="Create category"
                    onAction={goCreate}
                    className="px-0"
                  />
                </View>
              }
            />
          )}
        </View>
      </Sheet>
    </View>
  );
}
