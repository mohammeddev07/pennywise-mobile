import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Button } from "@/shared/ui/components/Button";
import { useBooksStore } from "@/features/books/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useSettingsStore } from "@/features/settings/store";

function ProfileRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <HapticPressable
      onPress={onPress}
      haptic="selection"
      pressScale={0.99}
      className="min-h-14 px-4 py-3 flex-row items-center"
      android_ripple={{ color: "#FFFFFF10" }}
    >
      <View className="flex-1 pr-3">
        <AppText variant="sm" tone="muted">
          {label}
        </AppText>
        <AppText variant="base" className="mt-0.5" numberOfLines={1}>
          {value}
        </AppText>
      </View>

      <View className="h-12 w-12 items-center justify-center">
        <Ionicons name="chevron-forward" size={18} color={tokens.colors.muted} />
      </View>
    </HapticPressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const transactions = useTransactionsStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.primaryCurrency);

  const booksPersist = (useBooksStore as any).persist;
  const txPersist = (useTransactionsStore as any).persist;
  const settingsPersist = (useSettingsStore as any).persist;

  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => booksPersist?.hasHydrated?.() ?? true);
  const [txHydrated, setTxHydrated] = useState<boolean>(() => txPersist?.hasHydrated?.() ?? true);
  const [settingsHydrated, setSettingsHydrated] = useState<boolean>(() => settingsPersist?.hasHydrated?.() ?? true);
  const [hydrationError, setHydrationError] = useState(false);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    if (booksPersist?.onFinishHydration) {
      const unsub = booksPersist.onFinishHydration(() => setBooksHydrated(true));
      unsubs.push(unsub);
      if (booksPersist?.hasHydrated && !booksPersist.hasHydrated()) booksPersist?.rehydrate?.();
    }

    if (txPersist?.onFinishHydration) {
      const unsub = txPersist.onFinishHydration(() => setTxHydrated(true));
      unsubs.push(unsub);
      if (txPersist?.hasHydrated && !txPersist.hasHydrated()) txPersist?.rehydrate?.();
    }

    if (settingsPersist?.onFinishHydration) {
      const unsub = settingsPersist.onFinishHydration(() => setSettingsHydrated(true));
      unsubs.push(unsub);
      if (settingsPersist?.hasHydrated && !settingsPersist.hasHydrated()) settingsPersist?.rehydrate?.();
    }

    const timeoutId = setTimeout(() => {
      const booksReady = booksPersist?.hasHydrated ? booksPersist.hasHydrated() : true;
      const txReady = txPersist?.hasHydrated ? txPersist.hasHydrated() : true;
      const settingsReady = settingsPersist?.hasHydrated ? settingsPersist.hasHydrated() : true;
      if (!booksReady || !txReady || !settingsReady) {
        setHydrationError(true);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      for (const unsub of unsubs) unsub?.();
    };
  }, [booksPersist, settingsPersist, txPersist]);

  const retryHydration = () => {
    setHydrationError(false);
    setBooksHydrated(booksPersist?.hasHydrated?.() ?? true);
    setTxHydrated(txPersist?.hasHydrated?.() ?? true);
    setSettingsHydrated(settingsPersist?.hasHydrated?.() ?? true);
    booksPersist?.rehydrate?.();
    txPersist?.rehydrate?.();
    settingsPersist?.rehydrate?.();
  };

  const hydrated = booksHydrated && txHydrated && settingsHydrated;

  const selectedBook = useMemo(() => books.find((b) => b.id === selectedBookId) ?? null, [books, selectedBookId]);

  const totalIncome = useMemo(
    () => transactions.filter((t) => t.kind === "income").reduce((sum, t) => sum + t.amountCents, 0),
    [transactions]
  );
  const totalExpense = useMemo(
    () => transactions.filter((t) => t.kind === "expense").reduce((sum, t) => sum + t.amountCents, 0),
    [transactions]
  );

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 12 }}>
      <View className="px-6">
        <AppText variant="2xl">Profile</AppText>
        <AppText variant="sm" tone="muted" className="mt-2">
          Account and app preferences
        </AppText>
      </View>

      <View className="flex-1 px-6 mt-6">
        {hydrationError ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="Couldn’t load profile"
              message="Retry to refresh books and settings."
              actionLabel="Retry"
              onAction={retryHydration}
              className="px-0"
            />
          </View>
        ) : !hydrated ? (
          <View className="gap-3">
            <Skeleton height={120} borderRadius={24} />
            <Skeleton height={160} borderRadius={24} />
            <Skeleton height={120} borderRadius={24} />
          </View>
        ) : books.length === 0 ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="No books yet"
              message="Create a book to personalize your profile dashboard."
              actionLabel="Create in switcher"
              onAction={() => router.push("/modals/book-switcher")}
              className="px-0"
            />
          </View>
        ) : (
          <>
            <Card variant="surface">
              <AppText variant="lg">PennyWise User</AppText>
              <AppText variant="sm" tone="muted" className="mt-1">
                Principal budget tracker
              </AppText>

              <View className="mt-4 flex-row">
                <View className="flex-1 rounded-lg border border-stroke bg-card p-3 mr-2">
                  <AppText variant="xs" tone="muted">
                    Books
                  </AppText>
                  <AppText variant="base" className="mt-1" style={{ fontFamily: "Inter_600SemiBold" }}>
                    {books.length}
                  </AppText>
                </View>

                <View className="flex-1 rounded-lg border border-stroke bg-card p-3 ml-2">
                  <AppText variant="xs" tone="muted">
                    Transactions
                  </AppText>
                  <AppText variant="base" className="mt-1" style={{ fontFamily: "Inter_600SemiBold" }}>
                    {transactions.length}
                  </AppText>
                </View>
              </View>
            </Card>

            <Card variant="surface" className="mt-6 p-0 overflow-hidden">
              <ProfileRow label="Active book" value={selectedBook?.name ?? "Personal"} onPress={() => router.push("/modals/book-switcher")} />
              <View className="h-px bg-stroke" />
              <ProfileRow label="Primary currency" value={currency} onPress={() => router.push("/(onboarding)/currency")} />
              <View className="h-px bg-stroke" />
              <ProfileRow label="Manage categories" value="Edit names, icons, and colors" onPress={() => router.push("/modals/category-editor")} />
            </Card>

            <Card variant="surface" className="mt-6">
              <AppText variant="sm" tone="muted">
                Lifetime totals
              </AppText>

              <View className="mt-3 flex-row items-center justify-between">
                <AppText variant="base">Income</AppText>
                <AppText variant="base" style={{ color: tokens.colors.accent, fontFamily: "Inter_600SemiBold" }}>
                  ${(totalIncome / 100).toFixed(2)}
                </AppText>
              </View>

              <View className="mt-3 flex-row items-center justify-between">
                <AppText variant="base">Expense</AppText>
                <AppText variant="base" style={{ fontFamily: "Inter_600SemiBold" }}>
                  ${(totalExpense / 100).toFixed(2)}
                </AppText>
              </View>
            </Card>

            <View className="mt-6">
              <Button label="Add transaction" onPress={() => router.push("/modals/add-transaction")} size="md" />
            </View>
          </>
        )}
      </View>
    </View>
  );
}
