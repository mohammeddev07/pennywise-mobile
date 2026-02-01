import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ConfettiCannon from "react-native-confetti-cannon";

import { Button } from "@/shared/ui/components/Button";
import { useTransactionsStore, type TransactionKind } from "@/features/transactions/store";

function parseAmountToCents(raw: string) {
  const cleaned = String(raw || "0").replace(/,/g, "").replace(/[^\d.-]/g, "");
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
    title?: string;
    category?: string;
    note?: string;
    bookId?: string;
    occurredAt?: string;
    currency?: string;
    paymentMethod?: string;
  }>();

  const amount = params.amount ?? "0";
  const kind = (params.kind === "income" ? "income" : "expense") as TransactionKind;

  const title = (params.title ?? "").trim();
  const category = (params.category ?? "Uncategorized").trim() || "Uncategorized";
  const note = (params.note ?? "").trim();

  const bookId = params.bookId ?? "personal";
  const occurredAt = params.occurredAt ?? new Date().toISOString();

  // ✅ crash fix: always include currency
  const currency = params.currency ?? "USD";
  const paymentMethod = (params.paymentMethod as any) ?? "cash";

  const cents = useMemo(() => parseAmountToCents(amount), [amount]);

  const [fire, setFire] = useState(false);
  const didAddRef = useRef(false);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (didAddRef.current) return;
    didAddRef.current = true;

    // Add transaction
    addTransaction({
      bookId,
      kind,
      amountCents: cents,
      currency,
      title: title.length ? title : category,
      category,
      note,
      paymentMethod,
      occurredAt,
    } as any);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setFire(true);

    // ✅ auto finish (premium)
    timeoutRef.current = setTimeout(() => {
      router.replace("/(tabs)/home");
    }, 850);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [addTransaction, bookId, cents, category, currency, kind, note, occurredAt, paymentMethod, router, title]);

  return (
    <View className="flex-1 bg-ink px-6" style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }}>
      {fire ? <ConfettiCannon count={90} fadeOut origin={{ x: width / 2, y: 0 }} /> : null}

      <View className="flex-1 items-center justify-center">
        <Text className="text-text text-2xl font-semibold">Transaction logged</Text>
        <Text className="text-muted mt-2 text-base" numberOfLines={1}>
          {title ? title : category}
        </Text>
        <Text className="text-muted mt-1 text-sm">
          {kind === "income" ? "Income" : "Expense"} • {currency}
        </Text>
      </View>

      <Button label="Done" onPress={() => router.replace("/(tabs)/home")} />
    </View>
  );
}
