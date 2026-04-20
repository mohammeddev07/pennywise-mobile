import { Alert, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, isSameDay, parseISO, subDays } from "date-fns";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import type { Transaction } from "@/features/transactions/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { Card } from "@/shared/ui/components/Card";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { formatSignedCurrency } from "@/shared/utils/formatCurrency";

function safeDate(iso: string) {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function whenLabel(iso: string) {
  const d = safeDate(iso);
  if (!d) return "Unknown";
  const now = new Date();
  if (isSameDay(d, now)) return "Today";
  if (isSameDay(d, subDays(now, 1))) return "Yesterday";
  return format(d, "MMM d");
}

function timeLabel(iso: string) {
  const d = safeDate(iso);
  if (!d) return "";
  return format(d, "h:mm a");
}

export function TransactionRow({
  item,
  enableActions = true,
}: {
  item: Transaction;
  enableActions?: boolean;
}) {
  const router = useRouter();

  const duplicateTransaction = useTransactionsStore((s) => s.duplicateTransaction);
  const removeTransaction = useTransactionsStore((s) => s.removeTransaction);
  const showDeleted = useUndoToastStore((s) => s.showDeleted);

  const isIncome = item.kind === "income";
  const amount = formatSignedCurrency(isIncome ? item.amountCents : -item.amountCents, item.currency);

  const primary = (item.title || "").trim() || (item.category || "").trim() || "Transaction";
  const category = (item.category || "Uncategorized").trim() || "Uncategorized";

  const onDelete = () => {
    Alert.alert("Delete transaction?", "You can undo this action for a few seconds.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const idx = useTransactionsStore.getState().transactions.findIndex((t) => t.id === item.id);
          removeTransaction(item.id);
          showDeleted(item, idx >= 0 ? idx : 0);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        },
      },
    ]);
  };

  const onDuplicate = () => {
    duplicateTransaction(item.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <Card variant="surface" className="p-0 overflow-hidden">
      <HapticPressable
        onPress={() => router.push({ pathname: "/modals/transaction-details", params: { id: item.id } })}
        className="px-4 py-3"
        haptic="selection"
        pressScale={0.99}
        android_ripple={{ color: "#FFFFFF10" }}
      >
        <View className="flex-row items-center">
          <View
            className="h-11 w-11 items-center justify-center rounded-full border border-stroke"
            style={{ backgroundColor: tokens.colors.card }}
          >
            <Ionicons
              name={isIncome ? "arrow-down" : "arrow-up"}
              size={18}
              color={isIncome ? tokens.colors.accent : tokens.colors.danger}
            />
          </View>

          <View className="ml-3 flex-1">
            <AppText variant="base" style={{ fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
              {primary}
            </AppText>
            <AppText variant="xs" tone="muted" className="mt-1" numberOfLines={1}>
              {category} • {(item.paymentMethod || "cash").toLowerCase()} • {whenLabel(item.occurredAt)} •{" "}
              {timeLabel(item.occurredAt)}
            </AppText>
          </View>

          <AppText
            variant="base"
            style={{ color: isIncome ? tokens.colors.accent : tokens.colors.text, fontFamily: "Inter_600SemiBold" }}
          >
            {amount}
          </AppText>
        </View>
      </HapticPressable>

      {enableActions ? (
        <>
          <View className="h-px bg-stroke" />

          <View className="flex-row">
            <HapticPressable
              onPress={onDuplicate}
              className="flex-1 min-h-12 px-4 py-3 flex-row items-center justify-center"
              haptic="selection"
              pressScale={0.99}
              android_ripple={{ color: "#FFFFFF10" }}
            >
              <Ionicons name="copy-outline" size={16} color={tokens.colors.accent} />
              <AppText variant="sm" className="ml-2 text-accent">
                Duplicate
              </AppText>
            </HapticPressable>

            <View className="w-px bg-stroke" />

            <HapticPressable
              onPress={onDelete}
              className="flex-1 min-h-12 px-4 py-3 flex-row items-center justify-center"
              haptic="selection"
              pressScale={0.99}
              android_ripple={{ color: "#FFFFFF10" }}
            >
              <Ionicons name="trash-outline" size={16} color={tokens.colors.danger} />
              <AppText variant="sm" tone="danger" className="ml-2">
                Delete
              </AppText>
            </HapticPressable>
          </View>
        </>
      ) : null}
    </Card>
  );
}
