import { useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { useBooksStore } from "@/features/books/store";
import { Sheet } from "@/shared/ui/components/Sheet";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Button } from "@/shared/ui/components/Button";
import { Input } from "@/shared/ui/components/Input";

export default function BookSwitcherRoute() {
  return <Redirect href="/(tabs)/settings" />;
}

function LegacyBookSwitcherModal() {
  const router = useRouter();

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const setSelectedBookId = useBooksStore((s) => s.setSelectedBookId);
  const addBook = useBooksStore((s) => s.addBook);
  const updateBook = useBooksStore((s) => s.updateBook);
  const removeBook = useBooksStore((s) => s.removeBook);

  const persist = (useBooksStore as any).persist;
  const [hydrated, setHydrated] = useState<boolean>(() => persist?.hasHydrated?.() ?? true);
  const [hydrationError, setHydrationError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");

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

  const startCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setName("");
  };

  const startEdit = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;
    setIsCreating(false);
    setEditingId(book.id);
    setName(book.name);
  };

  const resetEditor = () => {
    setIsCreating(false);
    setEditingId(null);
    setName("");
  };

  const saveBook = async () => {
    const finalName = name.trim();
    if (!finalName) return;
    setIsSaving(true);

    try {
      if (isCreating) {
        const id = await addBook({ name: finalName });
        setSelectedBookId(id);
        resetEditor();
        return;
      }

      if (editingId) {
        await updateBook(editingId, { name: finalName });
        resetEditor();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEditingBook = () => {
    if (!editingId) return;
    if (books.length <= 1) {
      Alert.alert("Keep one book", "You need at least one book to track transactions.");
      return;
    }

    Alert.alert("Delete book?", "Transactions in this book stay saved, but this book will no longer be selectable.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const didRemove = await removeBook(editingId);
          if (didRemove) resetEditor();
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title="Switch books"
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface"
            android_ripple={{ color: tokens.colors.ripple, borderless: true }}
          >
            <Ionicons name="close" size={18} color={tokens.colors.text} />
          </HapticPressable>
        }
        rightAction={
          <HapticPressable
            onPress={startCreate}
            haptic="selection"
            className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface"
            android_ripple={{ color: tokens.colors.ripple, borderless: true }}
          >
            <Ionicons name="add" size={20} color={tokens.colors.accent} />
          </HapticPressable>
        }
        footer={<Button label="Done" onPress={() => router.back()} size="md" />}
      >
        {hydrationError ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="Couldn’t load books"
              message="Retry to load available books."
              actionLabel="Retry"
              onAction={retryHydration}
              className="px-0"
            />
          </View>
        ) : !hydrated ? (
          <View className="mt-2 gap-3">
            <Skeleton height={72} borderRadius={20} />
            <Skeleton height={72} borderRadius={20} />
            <Skeleton height={72} borderRadius={20} />
          </View>
        ) : books.length === 0 && !isCreating ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="No books yet"
              message="Create your first book to start tracking."
              actionLabel="Create book"
              onAction={startCreate}
              className="px-0"
            />
          </View>
        ) : (
          <ScrollView className="mt-2" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {isCreating || editingId ? (
              <Card variant="surface" className="mb-4">
                <AppText variant="lg">{isCreating ? "New book" : "Edit book"}</AppText>
                <View className="mt-4 gap-4">
                  <Input label="Name" value={name} onChangeText={setName} placeholder="Household" autoCapitalize="words" />
                  <Button
                    label={isSaving ? "Saving..." : isCreating ? "Create book" : "Save book"}
                    onPress={saveBook}
                    disabled={!name.trim() || isSaving}
                    size="md"
                  />
                  <Button label="Cancel" variant="ghost" onPress={resetEditor} size="md" />
                  {editingId ? <Button label="Delete book" variant="danger" onPress={deleteEditingBook} size="md" /> : null}
                </View>
              </Card>
            ) : null}

            <View className="gap-3">
            {books.map((book) => {
              const active = book.id === selectedBookId;
              return (
                <Card
                  key={book.id}
                  variant="surface"
                  style={{
                    borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
                    backgroundColor: active ? `${tokens.colors.accent}14` : tokens.colors.surface,
                  }}
                >
                  <View className="flex-row items-center">
                    <HapticPressable
                      onPress={() => {
                        setSelectedBookId(book.id);
                        router.back();
                      }}
                      haptic="selection"
                      pressScale={0.99}
                      className="flex-1 pr-3"
                      android_ripple={{ color: tokens.colors.ripple }}
                    >
                      <AppText variant="base" weight="semibold" numberOfLines={1}>
                        {book.name}
                      </AppText>
                      <AppText variant="xs" tone="muted" className="mt-1" numberOfLines={1}>
                        {book.currencyCode} · {book.timezone}
                      </AppText>
                    </HapticPressable>

                    <HapticPressable
                      onPress={() => startEdit(book.id)}
                      haptic="selection"
                      pressScale={0.98}
                      className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-card"
                      android_ripple={{ color: tokens.colors.ripple, borderless: true }}
                    >
                      <Ionicons name="create-outline" size={16} color={tokens.colors.accent} />
                    </HapticPressable>

                    <View
                      className="ml-3 h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: active ? `${tokens.colors.accent}20` : "transparent" }}
                    >
                      <Ionicons
                        name={active ? "checkmark" : "chevron-forward"}
                        size={16}
                        color={active ? tokens.colors.accent : tokens.colors.muted}
                      />
                    </View>
                  </View>
                </Card>
              );
            })}
            </View>
          </ScrollView>
        )}
      </Sheet>
    </View>
  );
}
