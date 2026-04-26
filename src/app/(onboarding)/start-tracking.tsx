import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { Button } from "@/shared/ui/components/Button";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { useBooksStore } from "@/features/books/store";
import { useSettingsStore } from "@/features/settings/store";
import { useAuthStore } from "@/features/auth/store";

export default function StartTrackingScreen() {
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const books = useBooksStore((s) => s.books);
  const currency = useSettingsStore((s) => s.primaryCurrency);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const booksPersist = (useBooksStore as any).persist;
  const settingsPersist = (useSettingsStore as any).persist;

  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => booksPersist?.hasHydrated?.() ?? true);
  const [settingsHydrated, setSettingsHydrated] = useState<boolean>(() => settingsPersist?.hasHydrated?.() ?? true);
  const [hydrationError, setHydrationError] = useState(false);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    if (booksPersist?.onFinishHydration) {
      const unsub = booksPersist.onFinishHydration(() => setBooksHydrated(true));
      unsubs.push(unsub);
      if (booksPersist?.hasHydrated && !booksPersist.hasHydrated()) booksPersist?.rehydrate?.();
    }

    if (settingsPersist?.onFinishHydration) {
      const unsub = settingsPersist.onFinishHydration(() => setSettingsHydrated(true));
      unsubs.push(unsub);
      if (settingsPersist?.hasHydrated && !settingsPersist.hasHydrated()) settingsPersist?.rehydrate?.();
    }

    const timeoutId = setTimeout(() => {
      const booksReady = booksPersist?.hasHydrated ? booksPersist.hasHydrated() : true;
      const settingsReady = settingsPersist?.hasHydrated ? settingsPersist.hasHydrated() : true;
      if (!booksReady || !settingsReady) {
        setHydrationError(true);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      for (const unsub of unsubs) unsub?.();
    };
  }, [booksPersist, settingsPersist]);

  const retryHydration = () => {
    setHydrationError(false);
    setBooksHydrated(booksPersist?.hasHydrated?.() ?? true);
    setSettingsHydrated(settingsPersist?.hasHydrated?.() ?? true);
    booksPersist?.rehydrate?.();
    settingsPersist?.rehydrate?.();
  };

  const hydrated = booksHydrated && settingsHydrated;

  const bookName = useMemo(() => books.find((b) => b.id === selectedBookId)?.name ?? "Personal", [books, selectedBookId]);

  return (
    <View className="flex-1 bg-app px-6 pt-16 pb-10">
      <AppText variant="2xl">Time to start tracking</AppText>
      <AppText variant="base" tone="muted" className="mt-2">
        Confirm your setup and open your dashboard.
      </AppText>

      {hydrationError ? (
        <View className="flex-1 justify-center">
          <EmptyState
            title="Couldn’t finish setup"
            message="Retry to load your selected book and currency."
            actionLabel="Retry"
            onAction={retryHydration}
            className="px-0"
          />
        </View>
      ) : !hydrated ? (
        <View className="mt-8 gap-3">
          <Skeleton height={120} borderRadius={24} />
          <Skeleton height={160} borderRadius={24} />
        </View>
      ) : !bookName ? (
        <View className="flex-1 justify-center">
          <EmptyState
            title="No active book"
            message="Select a book to complete onboarding."
            actionLabel="Choose book"
            onAction={() => router.replace("/(onboarding)/books")}
            className="px-0"
          />
        </View>
      ) : (
        <Card variant="surface" className="mt-8">
          <AppText variant="xs" tone="muted" className="uppercase">
            Ready
          </AppText>

          <AppText variant="xl" className="mt-3">
            You&apos;re all set
          </AppText>

          <AppText variant="base" tone="muted" className="mt-3">
            Book: {bookName}
          </AppText>
          <AppText variant="base" tone="muted" className="mt-1">
            Currency: {currency}
          </AppText>
        </Card>
      )}

      <View className="mt-auto">
        <Button
          label="Open dashboard"
          onPress={() => {
            completeOnboarding();
            router.replace("/(tabs)/home");
          }}
        />
      </View>
    </View>
  );
}
