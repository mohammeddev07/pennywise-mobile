import { useEffect, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { Button } from "@/shared/ui/components/Button";
import { tokens } from "@/shared/ui/theme/tokens";
import { useBooksStore } from "@/features/books/store";

export default function BooksScreen() {
  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const setSelectedBookId = useBooksStore((s) => s.setSelectedBookId);

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

  return (
    <View className="flex-1 bg-app px-6 pt-16 pb-10">
      <AppText variant="2xl">Your books</AppText>
      <AppText variant="base" tone="muted" className="mt-2">
        Choose a book to start tracking.
      </AppText>

      {hydrationError ? (
        <View className="flex-1 justify-center">
          <EmptyState
            title="Couldn’t load books"
            message="Retry to continue onboarding."
            actionLabel="Retry"
            onAction={retryHydration}
            className="px-0"
          />
        </View>
      ) : !hydrated ? (
        <View className="mt-8 gap-3">
          <Skeleton height={72} borderRadius={24} />
          <Skeleton height={72} borderRadius={24} />
        </View>
      ) : books.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState
            title="No books yet"
            message="Create a book in the app and return to onboarding."
            className="px-0"
          />
        </View>
      ) : (
        <View className="mt-8 gap-3">
          {books.map((book) => {
            const active = book.id === selectedBookId;
            return (
              <HapticPressable
                key={book.id}
                onPress={() => {
                  setSelectedBookId(book.id);
                  router.push("/(onboarding)/currency");
                }}
                haptic="selection"
                pressScale={0.99}
              >
                <Card
                  variant="surface"
                  style={{
                    borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
                    backgroundColor: active ? `${tokens.colors.accent}12` : tokens.colors.surface,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <AppText variant="lg">{book.name}</AppText>
                      <AppText variant="sm" tone="muted" className="mt-1">
                        {book.subtitle ? book.subtitle : "CashBook Pro"}
                      </AppText>
                    </View>

                    <Ionicons
                      name={active ? "checkmark-circle" : "chevron-forward"}
                      size={18}
                      color={active ? tokens.colors.accent : tokens.colors.muted}
                    />
                  </View>
                </Card>
              </HapticPressable>
            );
          })}
        </View>
      )}

      <View className="mt-auto">
        <Button label="Next" onPress={() => router.push("/(onboarding)/currency")} size="md" />
      </View>
    </View>
  );
}
