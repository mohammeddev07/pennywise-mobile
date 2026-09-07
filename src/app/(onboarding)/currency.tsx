import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Button } from "@/shared/ui/components/Button";
import { Input } from "@/shared/ui/components/Input";
import { useSettingsStore, type CurrencyCode } from "@/features/settings/store";
import { useBooksStore } from "@/features/books/store";
import { useAuthStore } from "@/features/auth/store";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import * as authApi from "@/shared/api/auth";
import { getApiErrorMessage } from "@/shared/api/errors";
import { currencyMinorUnitDigits, majorToMinor } from "@/shared/utils/formatCurrency";
import { getAccountEpoch, isCurrentAccountEpoch } from "@/shared/session/accountEpoch";
import { Icon } from "@/shared/ui/components/Icon";

type Item = { code: CurrencyCode; symbol: string; name: string; sub: string };

const ITEMS: Item[] = [
  { code: "USD", symbol: "$", name: "USD", sub: "US Dollar" },
  { code: "EUR", symbol: "€", name: "EUR", sub: "Euro" },
  { code: "GBP", symbol: "£", name: "GBP", sub: "Pound" },
  { code: "JPY", symbol: "¥", name: "JPY", sub: "Yen" },
  { code: "INR", symbol: "₹", name: "INR", sub: "Indian Rupee" },
];

function parseStartingBalance(value: string, currency: CurrencyCode) {
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized) return 0;
  const fractionDigits = currencyMinorUnitDigits(currency);
  const pattern = fractionDigits === 0 ? /^-?\d+$/ : new RegExp(`^-?(?:\\d+|\\d*\\.\\d{1,${fractionDigits}})$`);
  if (!pattern.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  const minor = majorToMinor(amount, currency);
  return Number.isSafeInteger(minor) ? minor : null;
}

export default function CurrencyScreen() {
  const router = useRouter();

  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);
  const setPrimaryCurrency = useSettingsStore((s) => s.setPrimaryCurrency);
  const ensureBook = useBooksStore((s) => s.ensureBook);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const setUser = useAuthStore((s) => s.setUser);
  const [startingBalance, setStartingBalance] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const persist = (useSettingsStore as any).persist;
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

  const startingBalanceMinor = parseStartingBalance(startingBalance, primaryCurrency);
  const startingBalanceError =
    submitted && startingBalanceMinor === null
      ? `Enter a valid amount with no more than ${currencyMinorUnitDigits(primaryCurrency)} decimal places.`
      : undefined;

  const onContinue = async () => {
    setSubmitted(true);
    setApiError("");
    if (startingBalanceMinor === null) return;

    const accountEpoch = getAccountEpoch();
    setIsSubmitting(true);
    try {
      const bookId = await ensureBook({
        name: "Personal",
        currencyCode: primaryCurrency,
        openingBalanceMinor: startingBalanceMinor,
      });
      const book = useBooksStore.getState().books.find((item) => item.id === bookId);
      const bookCurrency = (book?.currencyCode ?? primaryCurrency) as CurrencyCode;
      const profile = await authApi.updateMe({ defaultCurrencyCode: bookCurrency });
      if (!isCurrentAccountEpoch(accountEpoch)) return;

      setUser(profile);
      setPrimaryCurrency((profile.defaultCurrencyCode ?? bookCurrency) as CurrencyCode);
      completeOnboarding();
      router.replace("/(tabs)/home");
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Couldn’t finish setup. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-app px-5 pt-16 pb-10">
      <AppText variant="2xl">Select currency</AppText>
      <AppText variant="base" tone="muted" className="mt-2">
        Choose the currency and opening balance for your cash book.
      </AppText>
      <View className="mt-4 flex-row items-start rounded-lg border border-stroke bg-surfaceAlt p-4">
        <Icon name="lock-closed-outline" size={16} color={tokens.colors.muted} style={{ marginTop: 2 }} />
        <AppText variant="sm" tone="muted" className="ml-3 flex-1">
          This is permanent. Amounts are stored without an exchange rate, so a book&apos;s
          currency can&apos;t be changed once it is created.
        </AppText>
      </View>

      {hydrationError ? (
        <View className="flex-1 justify-center">
          <EmptyState
            title="Couldn’t load settings"
            message="Retry to continue onboarding."
            actionLabel="Retry"
            onAction={retryHydration}
            className="px-0"
          />
        </View>
      ) : !hydrated ? (
        <View className="mt-8 gap-3">
          <Skeleton height={120} borderRadius={20} />
          <Skeleton height={120} borderRadius={20} />
          <Skeleton height={120} borderRadius={20} />
        </View>
      ) : (
        <ScrollView
          className="mt-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {ITEMS.map((item) => {
              const active = item.code === primaryCurrency;

              return (
                <HapticPressable
                  key={item.code}
                  onPress={() => setPrimaryCurrency(item.code)}
                  haptic="selection"
                  pressScale={0.98}
                  style={{ width: "48.5%" }}
                >
                  <Card
                    variant="surface"
                    style={{ borderColor: active ? tokens.colors.accent : tokens.colors.stroke, minHeight: 128 }}
                  >
                    <View className="flex-row items-start justify-between">
                      <AppText
                        variant="2xl"
                        weight="bold" style={{ color: active ? tokens.colors.accent : tokens.colors.text }}
                      >
                        {item.symbol}
                      </AppText>

                      {active ? (
                        <View
                          className="h-7 w-7 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${tokens.colors.accent}1F` }}
                        >
                          <AppText variant="sm" style={{ color: tokens.colors.accent }}>
                            ✓
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    <AppText variant="lg" className="mt-4">
                      {item.name}
                    </AppText>
                    <AppText variant="xs" tone="muted" className="mt-1">
                      {item.sub}
                    </AppText>
                  </Card>
                </HapticPressable>
              );
            })}
          </View>

          <Input
            label="Starting balance (optional)"
            value={startingBalance}
            onChangeText={setStartingBalance}
            placeholder={currencyMinorUnitDigits(primaryCurrency) === 0 ? "0" : "0.00"}
            keyboardType={currencyMinorUnitDigits(primaryCurrency) === 0 ? "number-pad" : "decimal-pad"}
            error={startingBalanceError}
            containerClassName="mt-6"
          />
          <AppText variant="xs" tone="muted" className="mt-2">
            This becomes the opening balance of your one cash book.
          </AppText>

          {apiError ? (
            <AppText variant="sm" tone="danger" className="mt-4">
              {apiError}
            </AppText>
          ) : null}
        </ScrollView>
      )}

      <View className="mt-auto">
        <Button
          label={isSubmitting ? "Creating your book..." : "Continue"}
          onPress={onContinue}
          loading={isSubmitting}
          disabled={!hydrated || hydrationError}
        />
      </View>
    </View>
  );
}
