import { useEffect, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { useBooksStore } from "@/features/books/store";
import { Sheet } from "@/shared/ui/components/Sheet";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Button } from "@/shared/ui/components/Button";

export default function BookSwitcherModal() {
  const router = useRouter();

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const setSelectedBookId = useBooksStore((s) => s.setSelectedBookId);
  const addBook = useBooksStore((s) => s.addBook);

  const persist = (useBooksStore as any).persist;
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

  const createBook = () => {
    const label = `Book ${books.length + 1}`;
    const id = addBook({ name: label, subtitle: "CashBook Pro" });
    setSelectedBookId(id);
  };

  return (
    <View className="flex-1 bg-ink">
      <Sheet
        tone="ink"
        className="flex-1"
        title="Switch books"
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="close" size={18} color={tokens.colors.text} />
          </HapticPressable>
        }
        rightAction={
          <HapticPressable
            onPress={createBook}
            haptic="selection"
            className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
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
            <Skeleton height={72} borderRadius={24} />
            <Skeleton height={72} borderRadius={24} />
            <Skeleton height={72} borderRadius={24} />
          </View>
        ) : books.length === 0 ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="No books yet"
              message="Create your first book to start tracking."
              actionLabel="Create book"
              onAction={createBook}
              className="px-0"
            />
          </View>
        ) : (
          <View className="mt-2 gap-3">
            {books.map((book) => {
              const active = book.id === selectedBookId;
              return (
                <HapticPressable
                  key={book.id}
                  onPress={() => {
                    setSelectedBookId(book.id);
                    router.back();
                  }}
                  haptic="selection"
                  pressScale={0.99}
                >
                  <Card
                    variant="surface"
                    style={{
                      borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
                      backgroundColor: active ? `${tokens.colors.accent}14` : tokens.colors.surface,
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 pr-3">
                        <AppText variant="base" style={{ fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
                          {book.name}
                        </AppText>
                        <AppText variant="xs" tone="muted" className="mt-1" numberOfLines={1}>
                          {book.subtitle ? book.subtitle : "CashBook Pro"}
                        </AppText>
                      </View>

                      {active ? (
                        <View
                          className="h-8 w-8 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${tokens.colors.accent}20` }}
                        >
                          <Ionicons name="checkmark" size={16} color={tokens.colors.accent} />
                        </View>
                      ) : (
                        <View className="h-8 w-8 items-center justify-center">
                          <Ionicons name="chevron-forward" size={16} color={tokens.colors.muted} />
                        </View>
                      )}
                    </View>
                  </Card>
                </HapticPressable>
              );
            })}
          </View>
        )}
      </Sheet>
    </View>
  );
}
