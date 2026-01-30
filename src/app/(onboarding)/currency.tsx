import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import type { CurrencyCode } from "@/shared/types/models";
import { useOnboardingStore } from "@/features/onboarding/useOnboardingStore";

const CURRENCIES: { code: CurrencyCode; name: string; symbol: string }[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
];

export default function CurrencyScreen() {
  const currency = useOnboardingStore((s) => s.currency);
  const setCurrency = useOnboardingStore((s) => s.setCurrency);

  const selectedLabel = useMemo(() => {
    const c = CURRENCIES.find((x) => x.code === currency);
    return c ? `${c.symbol} ${c.code}` : "None";
  }, [currency]);

  const safeBack = () => {
    Haptics.selectionAsync().catch(() => {});
    const canGoBack =
      typeof (router as any).canGoBack === "function" ? (router as any).canGoBack() : false;
    if (canGoBack) router.back();
    else router.replace("/(onboarding)/books");
  };

  return (
    <View className="flex-1 bg-app px-6 pt-14 pb-10">
      <View className="flex-row items-center">
        <Pressable
          onPress={safeBack}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={22} color="#E7EEF8" />
        </Pressable>
        <View className="ml-4">
          <Text className="text-text text-xl font-semibold">Currency</Text>
          <Text className="text-muted mt-1">Selected: {selectedLabel}</Text>
        </View>
      </View>

      <View className="mt-8 gap-3">
        {CURRENCIES.map((c) => {
          const active = c.code === currency;
          return (
            <Pressable
              key={c.code}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setCurrency(c.code);
                router.push("/(onboarding)/start-tracking");
              }}
              className={[
                "rounded-2xl border bg-surface px-4 py-4",
                active ? "border-accent" : "border-stroke",
              ].join(" ")}
              android_ripple={{ color: "#FFFFFF10" }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Text className="text-text text-lg font-semibold">{c.symbol}</Text>
                  <View className="ml-3">
                    <Text className="text-text font-semibold">{c.code}</Text>
                    <Text className="text-muted">{c.name}</Text>
                  </View>
                </View>

                <Ionicons
                  name={active ? "checkmark-circle" : "chevron-forward"}
                  size={18}
                  color={active ? "#00C805" : "#93A4B7"}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-auto">
        <Text className="text-muted text-xs text-center">
          Next: confirmation screen.
        </Text>
      </View>
    </View>
  );
}
