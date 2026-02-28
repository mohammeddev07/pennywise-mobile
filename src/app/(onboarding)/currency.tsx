import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Button } from "@/shared/ui/components/Button";
import { useSettingsStore, type CurrencyCode } from "@/features/settings/store";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";

type Item = { code: CurrencyCode; symbol: string; name: string; sub: string };

const ITEMS: Item[] = [
  { code: "USD", symbol: "$", name: "USD", sub: "US Dollar" },
  { code: "EUR", symbol: "€", name: "EUR", sub: "Euro" },
  { code: "GBP", symbol: "£", name: "GBP", sub: "Pound" },
  { code: "JPY", symbol: "¥", name: "JPY", sub: "Yen" },
  { code: "INR", symbol: "₹", name: "INR", sub: "Indian Rupee" },
];

export default function CurrencyScreen() {
  const router = useRouter();

  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);
  const setPrimaryCurrency = useSettingsStore((s) => s.setPrimaryCurrency);

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

  return (
    <View className="flex-1 bg-app px-6 pt-16 pb-10">
      <AppText variant="2xl">Select currency</AppText>
      <AppText variant="base" tone="muted" className="mt-2">
        Choose your primary currency for tracking.
      </AppText>

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
          <Skeleton height={120} borderRadius={24} />
          <Skeleton height={120} borderRadius={24} />
          <Skeleton height={120} borderRadius={24} />
        </View>
      ) : (
        <View className="mt-8 flex-row flex-wrap" style={{ gap: 8 }}>
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
                      style={{ color: active ? tokens.colors.accent : tokens.colors.text, fontFamily: "Inter_700Bold" }}
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
      )}

      <View className="mt-auto">
        <Button label="Continue" onPress={() => router.replace("/(onboarding)/start-tracking")} />
      </View>
    </View>
  );
}
