import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ConfettiCannon from "react-native-confetti-cannon";

import { Button } from "@/shared/ui/components/Button";
import { useTransactionsStore, type TransactionKind } from "@/features/transactions/store";

function parseAmountToCents(raw: string) {
  // Handles "$12,450.00" / "12,450.00" / "12.45"
  const cleaned = String(raw || "0")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export default function AddTransactionSuccess() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const addTransaction = useTransactionsStore((s) => s.addTransaction);

  const params = useLocalSearchParams<{
    amount?: string;
    kind?: string;
    category?: string;
    note?: string;
  }>();

  const amount = params.amount ?? "0";
  const kind = (params.kind === "income" ? "income" : "expense") as TransactionKind;
  const category = params.category ?? "Uncategorized";
  const note = params.note ?? "";

  const cents = useMemo(() => parseAmountToCents(amount), [amount]);

  const [fire, setFire] = useState(false);
  const didAddRef = useRef(false);

  useEffect(() => {
    if (didAddRef.current) return;
    didAddRef.current = true;

    addTransaction({
      kind,
      amountCents: cents,
      category,
      note,
      currency: "USD",
      paymentMethod: "cash",
      occurredAt: new Date().toISOString(),
    });

    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setFire(true);
  }, [addTransaction, cents, category, kind, note]);

  return (
    <View
      className="flex-1 bg-ink px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }}
    >
      {fire ? <ConfettiCannon count={90} fadeOut origin={{ x: width / 2, y: 0 }} /> : null}

      <View className="flex-1 items-center justify-center">
        <Text className="text-text text-2xl font-semibold">Transaction logged</Text>
        <Text className="text-muted mt-2 text-base">
          {kind === "income" ? "Income" : "Expense"} • {category}
        </Text>
      </View>

      <Button label="Done" onPress={() => router.replace("/(tabs)/home")} />
    </View>
  );
}
