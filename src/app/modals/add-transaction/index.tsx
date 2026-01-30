import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NumericKeypad, type Key } from "@/shared/ui/NumericKeypad";

type TxKind = "expense" | "income";

function clampAmount(next: string) {
  // Keep to 2 decimals if a dot exists
  if (!next.includes(".")) return next;

  const [a, b = ""] = next.split(".");
  return `${a}.${b.slice(0, 2)}`;
}

function formatParts(raw: string) {
  const n = Number(raw || "0");
  const fixed = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  const [i, d] = fixed.split(".");
  const intWithSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return { intWithSep, dec: d };
}

export default function AddTransactionEntry() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [kind, setKind] = useState<TxKind>("expense");
  const [amount, setAmount] = useState<string>("0");
  const [category, setCategory] = useState("Uncategorized");
  const [note, setNote] = useState("");

  const value = useMemo(() => Number(amount || "0") || 0, [amount]);
  const canReview = value > 0;

  const { intWithSep, dec } = useMemo(() => formatParts(amount), [amount]);

  const close = () => {
    Haptics.selectionAsync().catch(() => {});
    const canGoBack =
      typeof (router as any).canGoBack === "function" ? (router as any).canGoBack() : false;

    if (canGoBack) router.back();
    else router.replace("/(tabs)/home");
  };

  const onKey = (k: Key) => {
    setAmount((prev) => {
      let next = prev;

      if (k === "back") {
        next = prev.length <= 1 ? "0" : prev.slice(0, -1);
        if (next === "-" || next === "" || next === "0.") next = "0";
        return next;
      }

      if (k === ".") {
        if (prev.includes(".")) return prev;
        return prev + ".";
      }

      // digit
      if (prev === "0") next = k;
      else next = prev + k;

      next = clampAmount(next);
      return next;
    });
  };

  const goReview = () => {
    if (!canReview) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.push({
      pathname: "/modals/add-transaction/review",
      params: { amount, kind, category, note },
    });
  };

  return (
    <View
      className="flex-1 bg-ink"
      style={{
        paddingTop: insets.top + 10,
        paddingBottom: insets.bottom + 14,
      }}
    >
      {/* Top bar */}
      <View className="px-6">
        <View className="relative flex-row items-center justify-center">
          <Pressable
            onPress={close}
            className="absolute left-0 h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="close" size={18} color="#E7EEF8" />
          </Pressable>

          <Text className="text-muted text-sm">New transaction</Text>
        </View>

        {/* Segmented pill */}
        <View className="mt-6 items-center">
          <View className="flex-row rounded-full border border-stroke bg-surface overflow-hidden">
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setKind("expense");
              }}
              className={`px-6 py-3 ${kind === "expense" ? "bg-card" : ""}`}
            >
              <Text className={`${kind === "expense" ? "text-text" : "text-muted"} font-medium`}>
                Expense
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setKind("income");
              }}
              className={`px-6 py-3 ${kind === "income" ? "bg-card" : ""}`}
            >
              <Text className={`${kind === "income" ? "text-text" : "text-muted"} font-medium`}>
                Income
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Middle content */}
      <View className="flex-1 px-6">
        {/* Amount hero (visually centered) */}
        <View className="flex-1 items-center justify-center">
          <View className="flex-row items-end">
            <Text className="text-text text-4xl font-semibold mr-2 mb-3">$</Text>
            <Text className="text-text text-7xl font-semibold tracking-tight">{intWithSep}</Text>
            <Text className="text-text text-4xl font-semibold ml-2 mb-3">.{dec}</Text>
          </View>

          <Text className="text-muted mt-3">
            {kind === "expense" ? "Money out" : "Money in"} • Odometer animation next
          </Text>
        </View>

        {/* Two subtle rows above keypad */}
        <View className="gap-3 pb-4">
          <Pressable
            onPress={() => Haptics.selectionAsync().catch(() => {})}
            className="rounded-3xl border border-stroke bg-ink px-5 py-4"
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-muted text-xs">Category</Text>
                <Text className="text-text text-lg mt-1">{category}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#93A4B7" />
            </View>
          </Pressable>

          <Pressable
            onPress={() => Haptics.selectionAsync().catch(() => {})}
            className="rounded-3xl border border-stroke bg-ink px-5 py-4"
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-muted text-xs">Note</Text>
                <Text className="text-text text-lg mt-1">{note ? note : "Add note"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#93A4B7" />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Review CTA + keypad */}
      <View className="px-6">
        <Pressable
          onPress={goReview}
          disabled={!canReview}
          className={`h-12 items-center justify-center rounded-full ${
            canReview ? "bg-accent" : "bg-surface border border-stroke"
          }`}
          android_ripple={{ color: "#00000022", borderless: false }}
        >
          <Text className={`${canReview ? "text-black" : "text-muted"} font-semibold`}>
            Review
          </Text>
        </Pressable>

        <View className="mt-4">
          <NumericKeypad onKey={onKey} keyHeight={62} containerClassName="px-2" />
        </View>
      </View>
    </View>
  );
}
