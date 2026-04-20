import { useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { Button } from "@/shared/ui/components/Button";
import { useCategoriesStore } from "@/features/categories/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useBudgetsStore } from "@/features/budgets/store";
import { useBooksStore } from "@/features/books/store";
import { Sheet } from "@/shared/ui/components/Sheet";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Input } from "@/shared/ui/components/Input";
import { Skeleton } from "@/shared/ui/components/Skeleton";

const ICONS = [
  "pricetag-outline",
  "fast-food-outline",
  "basket-outline",
  "car-outline",
  "home-outline",
  "cart-outline",
  "cafe-outline",
  "airplane-outline",
  "fitness-outline",
  "medical-outline",
  "gift-outline",
  "cash-outline",
  "card-outline",
  "wallet-outline",
] as const;

const COLORS = ["#22C55E", "#60A5FA", "#A78BFA", "#F472B6", "#FFB020", "#34D399", "#F87171", "#94A3B8"];

export default function CategoryEditorModal() {
  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string; origin?: string }>();
  const origin = params.origin === "add-transaction" ? "add-transaction" : "other";

  const categories = useCategoriesStore((s) => s.categories);
  const addCategory = useCategoriesStore((s) => s.addCategory);
  const updateCategory = useCategoriesStore((s) => s.updateCategory);
  const removeCategory = useCategoriesStore((s) => s.removeCategory);
  const markLastCreatedCategoryName = useCategoriesStore((s) => s.markLastCreatedCategoryName);
  const renameTransactionCategory = useTransactionsStore((s) => s.renameTransactionCategory);
  const books = useBooksStore((s) => s.books);
  const renameBudgetCategory = useBudgetsStore((s) => s.renameBudgetCategory);
  const removeBudgetForCategory = useBudgetsStore((s) => s.removeBudgetForCategory);

  const persist = (useCategoriesStore as any).persist;
  const [hydrated, setHydrated] = useState<boolean>(() => persist?.hasHydrated?.() ?? true);
  const [hydrationError, setHydrationError] = useState(false);

  useEffect(() => {
    if (!persist?.onFinishHydration) return;

    const unsub = persist.onFinishHydration(() => {
      setHydrated(true);
      setHydrationError(false);
    });

    if (persist?.hasHydrated && !persist.hasHydrated()) {
      persist?.rehydrate?.();
    }

    const timeoutId = setTimeout(() => {
      if (persist?.hasHydrated && !persist.hasHydrated()) {
        setHydrationError(true);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      unsub?.();
    };
  }, [persist]);

  const retryHydration = () => {
    setHydrationError(false);
    setHydrated(persist?.hasHydrated?.() ?? true);
    persist?.rehydrate?.();
  };

  const editing = useMemo(() => {
    const id = params.id;
    if (!id) return null;
    return categories.find((c) => c.id === id) ?? null;
  }, [categories, params.id]);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState<(typeof ICONS)[number]>("pricetag-outline");
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (!editing) {
      setName("");
      setIcon("pricetag-outline");
      setColor(COLORS[0]);
      return;
    }
    setName(editing.name);
    setIcon((editing.icon as any) ?? "pricetag-outline");
    setColor(editing.color ?? COLORS[0]);
  }, [editing]);

  const title = editing ? "Edit category" : "New category";

  const onSave = () => {
    const finalName = name.trim() || "Untitled";

    if (editing) {
      const previousName = editing.name;
      updateCategory(editing.id, { name: finalName, icon, color });
      renameTransactionCategory(previousName, finalName);
      for (const book of books) {
        renameBudgetCategory(book.id, previousName, finalName);
      }
      router.back();
      return;
    }

    addCategory({ name: finalName, icon, color });

    if (origin === "add-transaction") {
      markLastCreatedCategoryName(finalName);
    }

    router.back();
  };

  const onDelete = () => {
    if (!editing) return;

    Alert.alert("Delete category?", "Existing transactions will keep their category label.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          for (const book of books) {
            removeBudgetForCategory(book.id, editing.name);
          }
          removeCategory(editing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title={title}
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="close" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        rightAction={
          editing ? (
            <HapticPressable
              onPress={onDelete}
              className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
              android_ripple={{ color: "#FFFFFF12", borderless: true }}
            >
              <Ionicons name="trash-outline" size={20} color={tokens.colors.danger} />
            </HapticPressable>
          ) : null
        }
        footer={
          <View className="gap-3">
            <Button label={editing ? "Save changes" : "Create category"} onPress={onSave} size="md" />
            {editing ? <Button label="Delete" variant="danger" onPress={onDelete} size="md" /> : null}
          </View>
        }
      >
        {hydrationError ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="Couldn’t load categories"
              message="Retry to continue editing category details."
              actionLabel="Retry"
              onAction={retryHydration}
              className="px-0"
            />
          </View>
        ) : !hydrated ? (
          <View className="mt-2 gap-3">
            <Skeleton height={56} borderRadius={16} />
            <Skeleton height={180} borderRadius={24} />
            <Skeleton height={120} borderRadius={24} />
          </View>
        ) : params.id && !editing ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="Category not found"
              message="This category may have been removed."
              actionLabel="Create new"
              onAction={() => router.replace("/modals/category-editor")}
              className="px-0"
            />
          </View>
        ) : (
          <>
            <View className="mt-2">
              <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Groceries" />
            </View>

            <Card variant="surface" className="mt-6">
              <AppText variant="xs" tone="muted" className="uppercase">
                Icon
              </AppText>

              <View className="mt-3 flex-row flex-wrap">
                {ICONS.map((n) => {
                  const active = n === icon;
                  return (
                    <HapticPressable
                      key={n}
                      onPress={() => setIcon(n)}
                      haptic="selection"
                      pressScale={0.98}
                      className="h-12 w-12 items-center justify-center rounded-lg border mr-3 mb-3"
                      style={{
                        borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
                        backgroundColor: active ? `${tokens.colors.accent}14` : tokens.colors.surface,
                      }}
                      android_ripple={{ color: "#FFFFFF10", borderless: true }}
                    >
                      <Ionicons name={n as any} size={20} color={active ? tokens.colors.accent : tokens.colors.text} />
                    </HapticPressable>
                  );
                })}
              </View>
            </Card>

            <Card variant="surface" className="mt-6">
              <AppText variant="xs" tone="muted" className="uppercase">
                Color
              </AppText>

              <View className="mt-3 flex-row flex-wrap">
                {COLORS.map((c) => {
                  const active = c === color;
                  return (
                    <HapticPressable
                      key={c}
                      onPress={() => setColor(c)}
                      haptic="selection"
                      pressScale={0.98}
                      className="h-12 w-12 items-center justify-center rounded-full border mr-3 mb-3"
                      style={{ borderColor: active ? tokens.colors.text : tokens.colors.stroke, backgroundColor: tokens.colors.surface }}
                      android_ripple={{ color: "#FFFFFF10", borderless: true }}
                    >
                      <View className="h-7 w-7 rounded-full" style={{ backgroundColor: c }} />
                    </HapticPressable>
                  );
                })}
              </View>
            </Card>
          </>
        )}
      </Sheet>
    </View>
  );
}
