import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SwipeUpToSubmit } from "@/shared/ui/components/SwipeUpToSubmit";

function format(amount: string) {
  const n = Number(amount || "0");
  const fixed = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  const [i, d] = fixed.split(".");
  const intWithSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return { intWithSep, dec: d };
}

export default function AddTransactionReview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    amount?: string;
    kind?: string;
    category?: string;
    note?: string;
  }>();

  const amount = params.amount ?? "0";
  const kind = params.kind ?? "expense";
  const category = params.category ?? "Uncategorized";
  const note = params.note ?? "";

  const { intWithSep, dec } = format(amount);

  return (
    <View
      className="flex-1 bg-ink px-6"
      style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 14 }}
    >
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            router.back();
          }}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color="#E7EEF8" />
        </Pressable>

        <Text className="text-muted text-sm">Review</Text>

        <View className="h-12 w-12" />
      </View>

      <View className="mt-10 items-center">
        <Text className="text-muted text-xs uppercase tracking-widest">
          {kind === "income" ? "Income" : "Expense"}
        </Text>

        <View className="mt-4 flex-row items-end">
          <Text className="text-text text-4xl font-semibold mr-2 mb-3">$</Text>
          <Text className="text-text text-7xl font-semibold tracking-tight">{intWithSep}</Text>
          <Text className="text-text text-4xl font-semibold ml-2 mb-3">.{dec}</Text>
        </View>
      </View>

      <View className="mt-10 gap-3">
        <View className="rounded-3xl border border-stroke bg-ink px-5 py-4">
          <Text className="text-muted text-xs">Category</Text>
          <Text className="text-text text-lg mt-1">{category}</Text>
        </View>

        <View className="rounded-3xl border border-stroke bg-ink px-5 py-4">
          <Text className="text-muted text-xs">Note</Text>
          <Text className="text-text text-lg mt-1">{note ? note : "—"}</Text>
        </View>

        <Text className="text-muted mt-2">
          Swipe up below to submit (Reanimated + gesture-handler).
        </Text>
      </View>

      <View className="mt-auto">
        <SwipeUpToSubmit onSubmit={() => router.replace("/modals/add-transaction/success")} />
      </View>
    </View>
  );
}
