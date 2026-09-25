import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { format, parseISO } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { Button } from "@/shared/ui/components/Button";
import { paymentMethodLabel } from "@/features/transactions/model";
import { useTransactionDetail } from "@/features/transactions/queries";
import { deleteTransaction, duplicateTransaction } from "@/features/transactions/actions";
import { isNotFoundError } from "@/features/transactions/model";
import { confirmDestructive } from "@/shared/ui/utils/confirm";
import { useCategoriesStore } from "@/features/categories/store";
import { useBookCurrency } from "@/features/books/useBookCurrency";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { Sheet } from "@/shared/ui/components/Sheet";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { IconButton } from "@/shared/ui/components/IconButton";
import { AppText } from "@/shared/ui/components/AppText";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { BottomSheetModal } from "@/shared/ui/components/BottomSheetModal";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { CategoryIcon } from "@/shared/ui/components/CategoryIcon";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { Icon } from "@/shared/ui/components/Icon";

function safeDate(iso: string) {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

/** One row in the overflow menu. Danger rows get the destructive color. */
function MenuRow({
  label,
  icon,
  onPress,
  danger,
  disabled,
}: {
  label: string;
  icon: "create-outline" | "copy-outline" | "trash-outline";
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const color = danger ? tokens.colors.danger : tokens.colors.text;

  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      haptic="none"
      pressScale={0.99}
      pressOpacity={1}
      accessibilityRole="button"
      android_ripple={{ color: tokens.colors.ripple }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: tokens.space[3],
        minHeight: tokens.layout.minTap + 8,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon name={icon} size={tokens.icon.row} color={color} />
      <AppText variant="base" weight="semibold" style={{ color }}>
        {label}
      </AppText>
    </HapticPressable>
  );
}

function DetailRow({ label, last, children }: { label: string; last?: boolean; children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: tokens.space[3],
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: tokens.colors.divider,
      }}
    >
      <AppText variant="xs" tone="muted" style={{ width: 88 }}>
        {label.toUpperCase()}
      </AppText>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>{children}</View>
    </View>
  );
}

export default function TransactionDetailsModal() {
  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string; bookId?: string }>();
  const id = String(params.id ?? "");

  const categories = useCategoriesStore((s) => s.categories);
  const showError = useUndoToastStore((s) => s.showError);

  // Fetched by id from the API: the row does not have to be in any loaded list page, so a link
  // from a chart, a notification or a page 40 deep in Activity resolves the same way.
  const detail = useTransactionDetail(id, params.bookId ? String(params.bookId) : undefined);
  const tx = detail.data ?? null;

  const currency = useBookCurrency(tx?.bookId);
  const [isMutating, setIsMutating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"edit" | "duplicate" | "delete" | null>(null);

  const categoryMeta = useMemo(() => {
    const name = tx?.categoryName ?? "Uncategorized";
    const hit = categories.find((c) => c.id === tx?.categoryId);
    return {
      name,
      icon: (hit?.icon as any) ?? ("pricetag-outline" as any),
      color: hit?.color ?? tokens.colors.muted,
    };
  }, [categories, tx]);

  const occurred = tx?.occurredAt ? safeDate(tx.occurredAt) : null;
  const occurredOn = tx?.occurredOn ? safeDate(tx.occurredOn) : occurred;
  const dateLabel = occurredOn ? format(occurredOn, "MMM d, yyyy") : "Unknown date";
  const timeLabel = occurred ? format(occurred, "h:mm a") : "Unknown time";
  // createdAt/updatedAt are when the record was written, not when the money moved.
  const created = tx?.createdAt ? safeDate(tx.createdAt) : null;
  const updated = tx?.updatedAt ? safeDate(tx.updatedAt) : null;
  const stampLabel = (d: Date | null) => (d ? format(d, "MMM d, yyyy 'at' h:mm a") : "at an unknown time");

  const onDelete = () => {
    if (!tx || isMutating) return;

    const what = `${tx.title?.trim() || categoryMeta.name} · ${formatCurrency(tx.amountMinor, currency)}`;
    confirmDestructive("Delete this transaction?", `${what} will be removed from your totals and charts. This can't be undone.`, async () => {
      setIsMutating(true);
      try {
        await deleteTransaction(tx);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        router.back();
      } catch (error) {
        showError(error, "Could not delete transaction.");
      } finally {
        setIsMutating(false);
      }
    });
  };

  const onDuplicate = async () => {
    if (!tx || isMutating) return;
    setIsMutating(true);
    try {
      const copy = await duplicateTransaction(tx);
      if (copy) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.replace({ pathname: "/modals/transaction-details", params: { id: copy.id, bookId: copy.bookId } });
      }
    } catch (error) {
      showError(error, "Could not duplicate transaction.");
    } finally {
      setIsMutating(false);
    }
  };

  const onEdit = () => {
    if (!tx) return;
    router.push({ pathname: "/modals/edit-transaction", params: { id: tx.id, bookId: tx.bookId } });
  };

  // The overflow menu is a real native `<Modal>`. Firing a second native
  // presentation - `Alert.alert` for Delete, or a navigation - in the same
  // tick as closing it raced the modal's own dismissal: on iOS in particular,
  // presenting on top of a view controller that is still being torn down can
  // silently drop the new presentation, which is exactly why Edit/Duplicate/
  // Delete looked like dead buttons. Closing the menu only queues the action;
  // it runs after `menuOpen` has actually committed to `false` and the modal
  // has had a beat to finish dismissing.
  useEffect(() => {
    if (menuOpen || !pendingAction) return;
    const action = pendingAction;
    const timeoutId = setTimeout(() => {
      setPendingAction(null);
      if (action === "edit") onEdit();
      else if (action === "duplicate") onDuplicate();
      else onDelete();
    }, tokens.motion.base);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen, pendingAction]);

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title="Transaction"
        leftAction={
          <IconButton icon="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />
        }
        rightAction={
          tx ? (
            <>
              {/* One clear primary action; Duplicate and Delete live behind the menu. */}
              <Button label="Edit" variant="secondary" size="md" style={{ width: 84 }} onPress={onEdit} />
              <IconButton icon="ellipsis-horizontal" accessibilityLabel="More actions" onPress={() => setMenuOpen(true)} />
            </>
          ) : null
        }
      >
        {detail.isError && !tx ? (
          <View className="flex-1 justify-center">
            {isNotFoundError(detail.error) ? (
              <EmptyState title="Not found" message="This transaction may have been deleted." className="px-0" />
            ) : (
              <EmptyState
                title="Couldn’t load transaction"
                message="Check your connection and try again."
                actionLabel="Retry"
                tone="danger"
                onAction={() => void detail.refetch()}
                className="px-0"
              />
            )}
          </View>
        ) : !tx ? (
          <View className="mt-2 gap-3">
            <Skeleton height={180} borderRadius={20} />
            <Skeleton height={120} borderRadius={20} />
          </View>
        ) : (
          // A receipt, not a dashboard: the amount first, then what it was, then quiet metadata.
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tokens.space[6] }}>
            <View style={{ alignItems: "center", marginTop: tokens.space[4] }}>
              <MoneyAmount value={formatCurrency(tx.amountMinor, currency)} kind={tx.type} size="amount" />
              <AppText variant="xl" style={{ marginTop: tokens.space[3], textAlign: "center" }} numberOfLines={3}>
                {tx.title?.trim() || categoryMeta.name}
              </AppText>
            </View>

            <View style={{ marginTop: tokens.space[6], borderTopWidth: 1, borderTopColor: tokens.colors.divider }}>
              <DetailRow label="Category">
                <CategoryIcon icon={categoryMeta.icon} color={categoryMeta.color} size={28} />
                <AppText variant="base" numberOfLines={2} style={{ flex: 1, marginLeft: tokens.space[3] }}>
                  {categoryMeta.name}
                </AppText>
              </DetailRow>
              <DetailRow label="Payment">
                <AppText variant="base" tone={tx.paymentMethod ? "default" : "muted"} style={{ flex: 1 }}>
                  {paymentMethodLabel(tx.paymentMethod)}
                </AppText>
              </DetailRow>
              <DetailRow label="Date">
                <AppText variant="base" style={{ flex: 1 }}>
                  {dateLabel} · {timeLabel}
                </AppText>
              </DetailRow>
              <DetailRow label="Note" last>
                <AppText variant="base" tone={tx.note?.trim() ? "default" : "muted"} style={{ flex: 1 }}>
                  {tx.note?.trim() ? tx.note.trim() : "No note added."}
                </AppText>
              </DetailRow>
            </View>

            {/* When the record was written, not when the money moved - kept quiet. */}
            <AppText variant="caption" tone="subtle" style={{ marginTop: tokens.space[5] }}>
              Added {stampLabel(created)}
              {updated && created && updated.getTime() !== created.getTime() ? ` · Edited ${stampLabel(updated)}` : ""}
            </AppText>
          </ScrollView>
        )}
      </Sheet>

      <BottomSheetModal visible={menuOpen} onClose={() => setMenuOpen(false)} title="More actions">
        <View style={{ gap: tokens.space[1] }}>
          <MenuRow
            icon="copy-outline"
            label="Duplicate"
            disabled={isMutating}
            onPress={() => {
              setPendingAction("duplicate");
              setMenuOpen(false);
            }}
          />
          <View style={{ height: 1, backgroundColor: tokens.colors.divider }} />
          <MenuRow
            icon="trash-outline"
            label="Delete"
            danger
            disabled={isMutating}
            onPress={() => {
              setPendingAction("delete");
              setMenuOpen(false);
            }}
          />
        </View>
      </BottomSheetModal>
    </View>
  );
}
