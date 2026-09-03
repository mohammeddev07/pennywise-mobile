import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { FormField } from "@/shared/ui/components/FormField";
import { ScreenHeader } from "@/shared/ui/components/ScreenHeader";
import { SectionHeader } from "@/shared/ui/components/SectionHeader";
import { SettingsRow } from "@/shared/ui/components/SettingsRow";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { useScreenPaddingX, useTabBarClearance } from "@/shared/ui/components/Screen";
import { useBooksStore } from "@/features/books/store";
import { useBookCurrency } from "@/features/books/useBookCurrency";
import { useSettingsStore } from "@/features/settings/store";
import { useAuthStore } from "@/features/auth/store";
import { formatCurrency, currencySymbol } from "@/shared/utils/formatCurrency";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";

/** A titled group of settings rows, separated by hairlines. */
function SettingsGroup({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children);

  return (
    <Card variant="surface" padding={0} style={{ overflow: "hidden" }}>
      {items.map((child, index) => (
        <View key={index}>
          {child}
          {index !== items.length - 1 ? (
            <View style={{ height: 1, marginLeft: tokens.space[4], backgroundColor: tokens.colors.divider }} />
          ) : null}
        </View>
      ))}
    </Card>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paddingX = useScreenPaddingX();
  const tabClearance = useTabBarClearance();

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const updateBook = useBooksStore((s) => s.updateBook);
  const currency = useBookCurrency();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const showError = useUndoToastStore((s) => s.showError);

  const booksPersist = (useBooksStore as any).persist;
  const settingsPersist = (useSettingsStore as any).persist;

  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => booksPersist?.hasHydrated?.() ?? true);
  const [settingsHydrated, setSettingsHydrated] = useState<boolean>(() => settingsPersist?.hasHydrated?.() ?? true);
  const [hydrationError, setHydrationError] = useState(false);
  const [bookName, setBookName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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
      setIsEditingName(false);
    } catch (error) {
      showError(error, "Couldn’t rename the cash book.");
    } finally {
      setIsSavingBook(false);
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

  const email = user?.email ?? "Email unavailable";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.colors.app,
        paddingTop: insets.top + tokens.layout.screenPadTop,
      }}
    >
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: paddingX, paddingBottom: tabClearance }}
      >
        <ScreenHeader title="Profile" />

        {hydrationError ? (
          <View style={{ marginTop: tokens.space[8] }}>
            <EmptyState
              title="Couldn’t load profile"
              message="Retry to refresh books and settings."
              actionLabel="Retry"
              tone="danger"
              onAction={retryHydration}
            />
          </View>
        ) : !hydrated ? (
          <View style={{ marginTop: tokens.space[6], gap: tokens.space[4] }}>
            <Skeleton height={88} borderRadius={20} />
            <Skeleton height={180} borderRadius={20} />
            <Skeleton height={60} borderRadius={20} />
          </View>
        ) : books.length === 0 ? (
          <View style={{ marginTop: tokens.space[8] }}>
            <EmptyState
              title="Cash book unavailable"
              message="Return home and retry while the app restores your account."
              actionLabel="Return home"
              tone="danger"
              onAction={() => router.replace("/(tabs)/home")}
            />
          </View>
        ) : (
          <>
            {/* Account */}
            <Card variant="surface" padding={16} style={{ marginTop: tokens.space[6] }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: tokens.radii.pill,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: tokens.colors.accent,
                  }}
                >
                  <AppText variant="base" weight="bold" style={{ color: tokens.colors.onAccent }}>
                    {email.slice(0, 1).toUpperCase()}
                  </AppText>
                </View>

                <View style={{ flex: 1, marginLeft: tokens.space[3] }}>
                  <AppText variant="base" weight="semibold" numberOfLines={1}>
                    {email}
                  </AppText>
                  <AppText variant="sm" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
                    {selectedBook?.name ?? "Personal"} · signed in
                  </AppText>
                </View>

                <View
                  style={{
                    paddingHorizontal: tokens.space[2],
                    paddingVertical: 4,
                    borderRadius: tokens.radii.pill,
                    backgroundColor: tokens.colors.greenSoft,
                  }}
                >
                  <AppText variant="xs" style={{ color: tokens.colors.accent }}>
                    SYNCED
                  </AppText>
                </View>
              </View>
            </Card>

            {/* Cash book */}
            <SectionHeader title="Cash book" style={{ marginTop: tokens.space[7], marginBottom: tokens.space[3] }} />

            {isEditingName ? (
              <Card variant="surface" padding={16}>
                <FormField
                  label="Book name"
                  value={bookName}
                  onChangeText={setBookName}
                  maxLength={80}
                  autoCorrect={false}
                  autoFocus
                />
                <View style={{ flexDirection: "row", gap: tokens.space[3], marginTop: tokens.space[4] }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Cancel"
                      variant="secondary"
                      size="md"
                      onPress={() => {
                        setBookName(selectedBook?.name ?? "");
                        setIsEditingName(false);
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={isSavingBook ? "Saving…" : "Save"}
                      size="md"
                      loading={isSavingBook}
                      disabled={!bookName.trim() || bookName.trim() === selectedBook?.name}
                      onPress={onSaveBook}
                    />
                  </View>
                </View>
              </Card>
            ) : (
              <SettingsGroup>
                <SettingsRow
                  icon="book-outline"
                  label="Book name"
                  value={selectedBook?.name ?? "Personal"}
                  onPress={() => setIsEditingName(true)}
                />
                <SettingsRow
                  icon="time-outline"
                  label="Opening balance"
                  value={formatCurrency(
                    selectedBook?.openingBalanceMinor ?? 0,
                    selectedBook?.currencyCode ?? currency
                  )}
                  locked
                />
                <SettingsRow
                  icon="cash-outline"
                  label="Currency"
                  value={`${currencySymbol(currency)} ${currency}`}
                  locked
                />
              </SettingsGroup>
            )}

            <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[3] }}>
              Opening balance and currency cannot be changed after a book is created — stored amounts
              carry no exchange rate, so switching would reinterpret every past transaction.
            </AppText>

            {/* Preferences */}
            <SectionHeader
              title="Preferences"
              style={{ marginTop: tokens.space[7], marginBottom: tokens.space[3] }}
            />
            <SettingsGroup>
              <SettingsRow
                icon="grid-outline"
                label="Categories & budgets"
                value="Names, icons, colors, budgets"
                onPress={() => router.push("/(tabs)/categories")}
              />
            </SettingsGroup>
          </>
        )}

        {/* Sign out sits apart from ordinary settings, and reads destructive. */}
        <View style={{ marginTop: tokens.space[7] }}>
          <Button
            label={isSigningOut ? "Signing out…" : "Sign out"}
            variant="danger"
            onPress={onLogout}
            loading={isSigningOut}
            size="md"
            leftIcon={<Ionicons name="log-out-outline" size={18} color={tokens.colors.danger} />}
          />
        </View>
      </ScrollView>
    </View>
  );
}
