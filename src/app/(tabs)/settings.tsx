import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
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
import { Input } from "@/shared/ui/components/Input";
import { CategoryIcon } from "@/shared/ui/components/CategoryIcon";
import { useBooksStore } from "@/features/books/store";
import { useBookCurrency } from "@/features/books/useBookCurrency";
import { useSettingsStore } from "@/features/settings/store";
import { useAuthStore } from "@/features/auth/store";
import { formatCurrency, currencySymbol } from "@/shared/utils/formatCurrency";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { useExportToastStore } from "@/shared/ui/state/useExportToastStore";
import { exportTransactionsToDevice, ExportCancelledError } from "@/shared/utils/exportFile";

function ProfileRow({
  label,
  value,
  onPress,
  disabled,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      pressScale={0.99}
      className="min-h-14 px-4 py-3 flex-row items-center"
      android_ripple={{ color: "#0B122012" }}
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
  const updateBook = useBooksStore((s) => s.updateBook);
  const currency = useBookCurrency();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const showError = useUndoToastStore((s) => s.showError);
  const showExportSuccess = useExportToastStore((s) => s.showSuccess);

  const booksPersist = (useBooksStore as any).persist;
  const settingsPersist = (useSettingsStore as any).persist;

  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => booksPersist?.hasHydrated?.() ?? true);
  const [settingsHydrated, setSettingsHydrated] = useState<boolean>(() => settingsPersist?.hasHydrated?.() ?? true);
  const [hydrationError, setHydrationError] = useState(false);
  const [bookName, setBookName] = useState("");
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const selectedBook = useMemo(() => books.find((b) => b.id === selectedBookId) ?? null, [books, selectedBookId]);

  useEffect(() => {
    setBookName(selectedBook?.name ?? "");
  }, [selectedBook?.id, selectedBook?.name]);

  const onSaveBook = async () => {
    if (!selectedBook || isSavingBook) return;
    const name = bookName.trim();
    if (!name) {
      showError(null, "Book name is required.");
      return;
    }

    setIsSavingBook(true);
    try {
      await updateBook(selectedBook.id, { name });
    } catch (error) {
      showError(error, "Couldn’t rename the cash book.");
    } finally {
      setIsSavingBook(false);
    }
  };

  const onExport = async () => {
    if (isExporting || !selectedBook) return;
    setIsExporting(true);
    try {
      const { fileName } = await exportTransactionsToDevice(selectedBook.id);
      showExportSuccess(`Saved ${fileName}`);
    } catch (error) {
      if (!(error instanceof ExportCancelledError)) {
        showError(error, "Couldn't export transactions.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const onLogout = () => {
    Alert.alert("Log out?", "You’ll need to sign in again to access your books.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await logout();
            router.replace("/(auth)/login");
          } catch (error) {
            showError(error, "Couldn’t clear all local account data. Please try again.");
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 12 }}>
      <View className="px-6">
        <AppText variant="3xl">Profile & Settings</AppText>
        <AppText variant="sm" tone="muted" className="mt-2">
          Manage your account and cash book
        </AppText>
      </View>

      <ScrollView
        className="flex-1 px-6 mt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 120 }}
      >
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
              title="Cash book unavailable"
              message="Return home and retry while the app restores your account."
              actionLabel="Return home"
              onAction={() => router.replace("/(tabs)/home")}
              className="px-0"
            />
          </View>
        ) : (
          <>
            <Card variant="surface">
              <View className="flex-row items-center">
                <CategoryIcon icon="person" color={tokens.colors.accent} size={72} />
                <View className="ml-4 flex-1">
                  <AppText variant="xl">{user?.email ?? "Email unavailable"}</AppText>
                  <AppText variant="sm" tone="muted" className="mt-1">
                    Signed-in account
                  </AppText>
                </View>
              </View>
            </Card>

            <Card variant="surface" className="mt-6">
              <AppText variant="lg">Cash book</AppText>
              <Input
                label="Book name"
                value={bookName}
                onChangeText={setBookName}
                maxLength={80}
                autoCorrect={false}
                containerClassName="mt-4"
              />
              <Button
                label={isSavingBook ? "Saving..." : "Save name"}
                onPress={onSaveBook}
                loading={isSavingBook}
                disabled={bookName.trim() === selectedBook?.name}
                size="md"
                className="mt-3"
              />

              <View className="mt-5 rounded-lg border border-stroke bg-surfaceAlt p-4">
                <AppText variant="sm" tone="muted">
                  Opening balance
                </AppText>
                <AppText variant="lg" className="mt-1">
                  {formatCurrency(selectedBook?.openingBalanceMinor ?? 0, selectedBook?.currencyCode ?? currency)}
                </AppText>
                <AppText variant="xs" tone="muted" className="mt-2">
                  The deployed API does not allow an opening balance to be changed after setup.
                </AppText>
              </View>
            </Card>

            <Card variant="surface" className="mt-6">
              <View className="flex-row items-center justify-between">
                <AppText variant="lg">Currency</AppText>
                <View className="flex-row items-center rounded-full border border-stroke bg-surfaceAlt px-3 py-1">
                  <Ionicons name="lock-closed" size={12} color={tokens.colors.muted} />
                  <AppText variant="xs" tone="muted" className="ml-1">
                    Locked
                  </AppText>
                </View>
              </View>

              <View className="mt-4 flex-row items-center">
                <CategoryIcon icon="cash-outline" color={tokens.colors.accent} size={48} />
                <View className="ml-4 flex-1">
                  <AppText variant="xl" weight="bold">
                    {currencySymbol(currency)} {currency}
                  </AppText>
                  <AppText variant="sm" tone="muted" className="mt-1">
                    Used for every amount in {selectedBook?.name ?? "this book"}
                  </AppText>
                </View>
              </View>

              <AppText variant="xs" tone="muted" className="mt-4">
                A book&apos;s currency is set when the book is created and cannot be changed
                afterwards - stored amounts have no exchange rate attached, so switching would
                silently reinterpret every past transaction.
              </AppText>
            </Card>

            <Card variant="surface" className="mt-6 p-0 overflow-hidden">
              <ProfileRow label="Manage categories" value="Edit names, icons, colors, and budgets" onPress={() => router.push("/modals/category-editor")} />
              <View className="h-px bg-stroke ml-4" />
              <ProfileRow
                label="Import transactions"
                value="Add transactions from an .xlsx file"
                onPress={() => router.push("/modals/import-transactions")}
              />
              <View className="h-px bg-stroke ml-4" />
              <ProfileRow
                label="Export transactions"
                value={isExporting ? "Exporting..." : `Save ${selectedBook?.name ?? "this book"} as .xlsx`}
                onPress={onExport}
                disabled={isExporting}
              />
            </Card>

          </>
        )}
        <View className="mt-6">
          <Button
            label={isSigningOut ? "Signing out..." : "Sign out"}
            variant="danger"
            onPress={onLogout}
            loading={isSigningOut}
            size="md"
          />
        </View>
      </ScrollView>
    </View>
  );
}
