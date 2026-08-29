import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import { amountColor, amountSoftColor } from "@/shared/ui/theme/money";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { Card } from "@/shared/ui/components/Card";
import type { TransactionKind } from "@/features/transactions/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { formatSignedCurrency, majorToMinor } from "@/shared/utils/formatCurrency";

function parseAmountToMinor(raw: string, currency: string) {
  const cleaned = String(raw || "0")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return majorToMinor(n, currency);
}

/**
 * Confirmation for a transaction that is already persisted - `details` saves,
 * then replaces to here. This screen only reports and clears the draft, so it
 * has no failure state of its own.
 */
export default function AddTransactionSuccess() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const resetDraft = useAddTransactionDraftStore((s) => s.reset);

  const params = useLocalSearchParams<{
    amount?: string;
    kind?: string;
    title?: string;
    categoryName?: string;
    currency?: string;
  }>();

  const kind: TransactionKind = params.kind === "INCOME" ? "INCOME" : "EXPENSE";
  const currency = params.currency ?? "USD";
  const category = (params.categoryName ?? "Uncategorized").trim() || "Uncategorized";
  const title = (params.title ?? "").trim();
  const amountMinor = useMemo(() => parseAmountToMinor(params.amount ?? "0", currency), [params.amount, currency]);

  const didFinishRef = useRef(false);
  useEffect(() => {
    if (didFinishRef.current) return;
    didFinishRef.current = true;
    resetDraft();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [resetDraft]);

  return (
    <View
      className="flex-1 bg-app px-6"
      style={{ paddingTop: insets.top + tokens.space[6], paddingBottom: insets.bottom + tokens.space[4] }}
    >
      <View className="flex-1 items-center justify-center">
        <Animated.View
          entering={FadeIn.duration(240)}
          className="h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: tokens.colors.greenSoft }}
        >
          <Ionicons name="checkmark" size={40} color={tokens.semantic.primary} />
        </Animated.View>

        <AppText variant="2xl" className="mt-6 text-center">
          Transaction saved
        </AppText>
        <AppText variant="sm" tone="muted" className="mt-2 text-center">
          Home, Transactions, and Analytics are up to date.
        </AppText>

        <Animated.View entering={FadeInDown.duration(280).delay(80)} className="mt-8 w-full">
          <Card variant="surface" className="items-center">
            <View className="rounded-full px-4 py-2" style={{ backgroundColor: amountSoftColor(kind) }}>
              <AppText variant="sm" weight="semibold" style={{ color: amountColor(kind) }}>
                {kind === "INCOME" ? "Income" : "Expense"}
              </AppText>
            </View>

            <AppText variant="amount" className="mt-4" style={{ color: amountColor(kind) }} numberOfLines={1}>
              {formatSignedCurrency(kind === "EXPENSE" ? -amountMinor : amountMinor, currency)}
            </AppText>

            <AppText variant="lg" className="mt-3 text-center" numberOfLines={1}>
              {title || category}
            </AppText>
            <AppText variant="sm" tone="muted" className="mt-1 text-center" numberOfLines={1}>
              {category} · {currency}
            </AppText>
          </Card>
        </Animated.View>
      </View>

      <View style={{ gap: tokens.space[3] }}>
        <Button label="Add another" variant="outline" size="md" onPress={() => router.replace("/modals/add-transaction")} />
        <Button label="Done" size="lg" onPress={() => router.replace("/(tabs)/home")} />
      </View>
    </View>
  );
}
