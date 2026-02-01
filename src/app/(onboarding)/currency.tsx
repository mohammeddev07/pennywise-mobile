import { useMemo } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Button } from "@/shared/ui/components/Button";
import { useSettingsStore, type CurrencyCode } from "@/features/settings/store";

type Item = { code: CurrencyCode; symbol: string; name: string; sub: string; wide?: boolean };

const ITEMS: Item[] = [
  { code: "USD", symbol: "$", name: "USD", sub: "US DOLLAR" },
  { code: "EUR", symbol: "€", name: "EUR", sub: "EURO" },
  { code: "GBP", symbol: "£", name: "GBP", sub: "POUND" },
  { code: "JPY", symbol: "¥", name: "JPY", sub: "YEN" },
  { code: "INR", symbol: "₹", name: "INR", sub: "INDIAN RUPEE", wide: true },
];

export default function CurrencyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);
  const setPrimaryCurrency = useSettingsStore((s) => s.setPrimaryCurrency);

  const grid = useMemo(() => ITEMS, []);

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }}>
      <View className="px-6">
        <Text className="text-text text-3xl font-semibold">Select Currency</Text>
        <Text className="text-muted mt-2">Choose your primary currency for tracking</Text>
      </View>

      <View className="px-6 mt-10">
        <View className="flex-row flex-wrap" style={{ gap: 14 }}>
          {grid.map((it) => {
            const active = it.code === primaryCurrency;
            const w = it.wide ? "100%" : "47%";

            return (
              <HapticPressable
                key={it.code}
                onPress={() => setPrimaryCurrency(it.code)}
                haptic="selection"
                className="rounded-[28px] border bg-surface"
                style={{
                  width: w as any,
                  borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
                  padding: 18,
                  minHeight: it.wide ? 88 : 168,
                }}
                android_ripple={{ color: "#FFFFFF10" }}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    style={{
                      color: active ? tokens.colors.accent : tokens.colors.muted,
                      fontSize: it.wide ? 26 : 42,
                      fontWeight: "900",
                    }}
                  >
                    {it.symbol}
                  </Text>

                  {active ? (
                    <View
                      style={{
                        height: 22,
                        width: 22,
                        borderRadius: 11,
                        backgroundColor: tokens.colors.accent,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#061007", fontWeight: "900" }}>✓</Text>
                    </View>
                  ) : null}
                </View>

                <View style={{ marginTop: it.wide ? 0 : 22 }}>
                  <Text className="text-text font-semibold">{it.name}</Text>
                  <Text className="text-muted text-xs mt-2 tracking-widest">{it.sub}</Text>
                </View>
              </HapticPressable>
            );
          })}
        </View>
      </View>

      <View className="px-6 mt-auto">
        <Button
          label="Continue"
          onPress={() => {
            // route to next onboarding step or tabs
            // keep safe: go to tabs by default
            router.replace("/(tabs)/home");
          }}
        />
      </View>
    </View>
  );
}
