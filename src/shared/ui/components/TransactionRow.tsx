import { View } from "react-native";
import { format, isSameDay, parseISO, subDays } from "date-fns";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import type { Transaction } from "@/features/transactions/model";
import { useBookCurrency } from "@/features/books/useBookCurrency";
import { deleteTransaction, duplicateTransaction } from "@/features/transactions/actions";
import { alertCompat, confirmDestructive } from "@/shared/ui/utils/confirm";
import { useCategoriesStore } from "@/features/categories/store";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { Card } from "@/shared/ui/components/Card";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { CategoryIcon } from "@/shared/ui/components/CategoryIcon";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { amountColor } from "@/shared/ui/theme/money";

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

/**
 * One transaction, one row.
 *
 * `embedded` is the default shape in a grouped list: no card, no chevron, just
 * the row - grouping is done with dividers and section headers instead of
 * wrapping every item in its own container.
 */
export function TransactionRow({
  item,
  enableActions = true,
  embedded = false,
  /** Hide the day when the row already sits under a day header. */
  showDay = true,
}: {
  item: Transaction;
  enableActions?: boolean;
  embedded?: boolean;
  showDay?: boolean;
}) {
  const router = useRouter();

  const showError = useUndoToastStore((s) => s.showError);
  const currency = useBookCurrency(item.bookId);
  const isIncome = item.type === "INCOME";

  // The tile carries the category's own icon and color, so a long list is
  // scannable by category. Direction is never carried by the tile alone: the
  // amount always shows both a sign and a money color.
  const category = useCategoriesStore((s) => s.categories.find((c) => c.id === item.categoryId));
  const tileIcon = category?.icon ?? (isIncome ? "arrow-down" : "arrow-up");
  const tileColor = category?.color ?? amountColor(item.type);

  const primary = (item.title || "").trim() || (item.categoryName || "").trim() || "Transaction";
  const categoryLabel = (item.categoryName || "Uncategorized").trim() || "Uncategorized";

  const meta = [categoryLabel, showDay ? whenLabel(item.occurredOn || item.occurredAt) : null, timeLabel(item.occurredAt)]
    .filter(Boolean)
    .join(" · ");

  const onDelete = () => {
    confirmDestructive("Delete transaction?", "This action cannot be undone.", async () => {
      try {
        await deleteTransaction(item);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } catch (error) {
        showError(error, "Could not delete transaction.");
      }
    });
  };

  const onDuplicate = () => {
    duplicateTransaction(item)
      .then((copy) => {
        if (copy) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      })
      .catch((error) => showError(error, "Could not duplicate transaction."));
  };

  const openActions = () => {
    if (!enableActions) return;
    alertCompat("Transaction actions", primary, [
      { text: "Duplicate", onPress: onDuplicate },
      { text: "Delete", style: "destructive", onPress: onDelete },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const row = (
    <HapticPressable
      onPress={() => router.push({ pathname: "/modals/transaction-details", params: { id: item.id, bookId: item.bookId } })}
      onLongPress={openActions}
      // Opening the detail screen is a read - silent. The write it may lead to
      // fires its own confirmation.
      haptic="none"
      pressScale={0.995}
      pressOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={`${primary}, ${isIncome ? "income" : "expense"} ${formatCurrency(item.amountMinor, currency)}, ${meta}`}
      android_ripple={{ color: tokens.colors.ripple }}
      style={{
        minHeight: tokens.layout.listRowHeight,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: tokens.space[3],
        paddingHorizontal: embedded ? 0 : tokens.space[4],
      }}
    >
      <CategoryIcon icon={tileIcon} color={tileColor} size={40} rounded="full" />

      <View style={{ flex: 1, marginLeft: tokens.space[3], paddingRight: tokens.space[3] }}>
        <AppText variant="base" weight="semibold" numberOfLines={1}>
          {primary}
        </AppText>
        <AppText variant="sm" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
          {meta}
        </AppText>
      </View>

      <MoneyAmount value={formatCurrency(item.amountMinor, currency)} kind={item.type} size="base" weight="bold" />
    </HapticPressable>
  );

  if (embedded) return row;

  return (
    <Card variant="surface" padding={0} style={{ overflow: "hidden" }}>
      {row}
    </Card>
  );
}

export default TransactionRow;
