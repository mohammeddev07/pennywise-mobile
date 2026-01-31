import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/shared/ui/theme/tokens";
import { SwipeUpToSubmit } from "@/shared/ui/components/SwipeUpToSubmit";

function money(amount: string) {
  const n = Number(amount || "0");
  const fixed = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  return fixed;
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
  const kind = params.kind === "income" ? "income" : "expense";
  const category = params.category ?? "Uncategorized";
  const note = params.note ?? "";

  const amountFixed = money(amount);

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top + 10 }}>
      {/* Top bar */}
      <View className="px-6 flex-row items-center justify-between">
        <Pressable
          onPress={() => {
            try {
              void Haptics.selectionAsync();
            } catch {}
            router.back();
          }}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </Pressable>

        <Text style={{ color: tokens.colors.accent }} className="text-xs font-extrabold tracking-widest">
          REVIEW ORDER
        </Text>

        <View className="h-12 w-12" />
      </View>

      {/* Hero */}
      <View className="items-center mt-12 px-6">
        <Text className="text-muted text-xs uppercase tracking-widest">
          {kind === "income" ? "Income" : "Expense"}
        </Text>

        <View className="mt-5 flex-row items-end">
          <Text className="text-muted text-4xl font-semibold mr-2 mb-3">$</Text>
          <Text className="text-text text-7xl font-semibold tracking-tight">
            {amountFixed}
          </Text>
        </View>

        <Text className="text-muted mt-3">Paying from Cash Balance</Text>
      </View>

      {/* Divider rows */}
      <View className="mt-10 px-6">
        <View className="h-px bg-stroke" />

        <Row
          left="Category"
          right={category}
          rightMuted={false}
        />
        <View className="h-px bg-stroke" />

        <Row
          left="Note"
          right={note ? note : "Add a note…"}
          rightMuted={!note}
        />
        <View className="h-px bg-stroke" />

        <Row
          left="Total cost"
          right={`$${amountFixed}`}
          rightMuted={false}
          rightBold
        />
        <View className="h-px bg-stroke" />
      </View>

      {/* Order summary */}
      <View className="px-6 mt-10" style={{ paddingBottom: (insets.bottom || 0) + 140 }}>
        <Text className="text-text text-base font-semibold">Order summary</Text>

        <Text className="text-muted mt-3 leading-6">
          You are logging a transaction of ${amountFixed} for {category}. This will update your totals immediately.
          Once submitted, this entry will appear in your activity list and analytics.
        </Text>

        <Pressable
          onPress={() => {}}
          className="mt-3 self-start"
          android_ripple={{ color: "#FFFFFF10" }}
        >
          <Text className="text-muted underline">Disclosures</Text>
        </Pressable>
      </View>

      {/* Swipe sheet (absolute) */}
      <SwipeUpToSubmit
        onSubmit={() =>
          router.replace({
            pathname: "/modals/add-transaction/success",
            params: { amount, kind, category, note },
          })
        }
      />
    </View>
  );
}

function Row({
  left,
  right,
  rightMuted,
  rightBold,
}: {
  left: string;
  right: string;
  rightMuted?: boolean;
  rightBold?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between py-5">
      <Text className="text-text text-base font-semibold">{left}</Text>
      <Text
        className={rightBold ? "text-text text-base font-semibold" : "text-text text-base"}
        style={{ color: rightMuted ? tokens.colors.muted : tokens.colors.text }}
        numberOfLines={1}
      >
        {right}
      </Text>
    </View>
  );
}
