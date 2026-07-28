import { Alert, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, isSameDay, parseISO, subDays } from "date-fns";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import type { Transaction } from "@/features/transactions/store";
import { useTransactionsStore } from "@/features/transactions/store";
import { useBooksStore } from "@/features/books/store";
import { useSettingsStore } from "@/features/settings/store";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { Card } from "@/shared/ui/components/Card";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { CategoryIcon } from "@/shared/ui/components/CategoryIcon";
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
  embedded = false,
}: {
  item: Transaction;
  enableActions?: boolean;
  embedded?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const duplicateTransaction = useTransactionsStore((s) => s.duplicateTransaction);
  const removeTransaction = useTransactionsStore((s) => s.removeTransaction);
  const showError = useUndoToastStore((s) => s.showError);
  const books = useBooksStore((s) => s.books);
  const fallbackCurrency = useSettingsStore((s) => s.primaryCurrency);

  const currency = books.find((b) => b.id === item.bookId)?.currencyCode ?? fallbackCurrency;
  const isIncome = item.type === "INCOME";
  const amount = formatSignedCurrency(isIncome ? item.amountMinor : -item.amountMinor, currency);

  const primary = (item.title || "").trim() || (item.categoryName || "").trim() || "Transaction";
  const category = (item.categoryName || "Uncategorized").trim() || "Uncategorized";

  const onDelete = () => {
    Alert.alert("Delete transaction?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeTransaction(item.id);
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["balance", item.bookId] }),
              queryClient.invalidateQueries({ queryKey: ["summary", item.bookId] }),
            ]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          } catch (error) {
            showError(error, "Could not delete transaction.");
          }
        },
      },
    ]);
  };

  const onDuplicate = () => {
    duplicateTransaction(item.id)
      .then(async (duplicatedId) => {
        if (duplicatedId) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["balance", item.bookId] }),
            queryClient.invalidateQueries({ queryKey: ["summary", item.bookId] }),
          ]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else {
          showError(undefined, "Transaction is no longer available.");
        }
      })
      .catch((error) => showError(error, "Could not duplicate transaction."));
  };

  const openActions = () => {
    if (!enableActions) return;
    Alert.alert("Transaction actions", primary, [
      { text: "Duplicate", onPress: onDuplicate },
      { text: "Delete", style: "destructive", onPress: onDelete },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const row = (
    <HapticPressable
        onPress={() => router.push({ pathname: "/modals/transaction-details", params: { id: item.id } })}
        onLongPress={openActions}
        className="px-4 py-3"
        haptic="selection"
        pressScale={0.99}
        android_ripple={{ color: "#0B12200F" }}
      >
        <View className="flex-row items-center">
          <CategoryIcon
            icon={isIncome ? "arrow-down" : "arrow-up"}
            color={isIncome ? tokens.colors.accent : tokens.colors.danger}
            size={52}
          />

          <View className="ml-3 flex-1">
            <AppText variant="base" style={{ fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
              {primary}
            </AppText>
            <AppText variant="xs" tone="muted" className="mt-1" numberOfLines={1}>
              {category} • {whenLabel(item.occurredOn || item.occurredAt)} • {timeLabel(item.occurredAt)}
            </AppText>
          </View>

          <AppText
            variant="base"
            style={{ color: isIncome ? tokens.colors.accent : tokens.colors.text, fontFamily: "Inter_600SemiBold" }}
          >
            {amount}
          </AppText>

          <Ionicons name="chevron-forward" size={18} color={tokens.colors.muted} style={{ marginLeft: 8 }} />
        </View>
      </HapticPressable>
  );

  if (embedded) return row;

  return (
    <Card variant="surface" padding={0} className="overflow-hidden">
      {row}
    </Card>
  );
}
