import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { format, parseISO } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { Button } from "@/shared/ui/components/Button";
import { useTransactionsStore } from "@/features/transactions/store";
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

/**
 * `Alert.alert` on web (`react-native-web`) is a complete no-op - it neither
 * shows a dialog nor ever invokes a button's `onPress` - so Delete's
 * confirmation, and the deletion behind it, silently never ran there. `window
 * .confirm` is the browser's native equivalent for the same yes/no decision.
 */
function confirmDestructive(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}

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

export default function TransactionDetailsModal() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const params = useLocalSearchParams<{ id?: string }>();
  const id = String(params.id ?? "");

  const transactions = useTransactionsStore((s) => s.transactions);
  const removeTransaction = useTransactionsStore((s) => s.removeTransaction);
  const duplicateTransaction = useTransactionsStore((s) => s.duplicateTransaction);
  const categories = useCategoriesStore((s) => s.categories);
  const showError = useUndoToastStore((s) => s.showError);

  const txPersist = (useTransactionsStore as any).persist;
  const [hydrated, setHydrated] = useState<boolean>(() => {
    const has = txPersist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });
  const [hydrationError, setHydrationError] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"edit" | "duplicate" | "delete" | null>(null);

  useEffect(() => {
    if (!txPersist?.onFinishHydration) return;

    const unsub = txPersist.onFinishHydration(() => {
      setHydrated(true);
      setHydrationError(false);
    });

    if (txPersist?.hasHydrated && !txPersist.hasHydrated()) {
      txPersist?.rehydrate?.();
    }

    const timeoutId = setTimeout(() => {
      if (txPersist?.hasHydrated && !txPersist.hasHydrated()) {
        setHydrationError(true);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      unsub?.();
    };
  }, [txPersist]);

  const tx = useMemo(() => transactions.find((t) => t.id === id) ?? null, [transactions, id]);

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
  const dateLabel = occurredOn ? format(occurredOn, "MMM d, yyyy") : "—";
  const timeLabel = occurred ? format(occurred, "h:mm a") : "—";

  const onDelete = () => {
    if (!tx || isMutating) return;

    confirmDestructive("Delete transaction?", "This action cannot be undone.", async () => {
      setIsMutating(true);
      try {
        await removeTransaction(tx.id);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["balance", tx.bookId] }),
          queryClient.invalidateQueries({ queryKey: ["summary", tx.bookId] }),
        ]);
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
      const duplicatedId = await duplicateTransaction(tx.id);
      if (duplicatedId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["balance", tx.bookId] }),
          queryClient.invalidateQueries({ queryKey: ["summary", tx.bookId] }),
        ]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.replace({ pathname: "/modals/transaction-details", params: { id: duplicatedId } });
      } else {
        showError(undefined, "Transaction is no longer available.");
      }
    } catch (error) {
      showError(error, "Could not duplicate transaction.");
    } finally {
      setIsMutating(false);
    }
  };

  const onEdit = () => {
    if (!tx) return;
    router.push({ pathname: "/modals/edit-transaction", params: { id: tx.id } });
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

  const retryHydration = () => {
    setHydrationError(false);
    setHydrated(txPersist?.hasHydrated?.() ?? true);
    txPersist?.rehydrate?.();
  };
  const currency = useBookCurrency(tx?.bookId);

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title="Transaction"
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: tokens.colors.ripple, borderless: true }}
          >
            <Icon name="chevron-back" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        rightAction={
          tx ? (
            <IconButton
              icon="ellipsis-horizontal"
              accessibilityLabel="More actions"
              onPress={() => setMenuOpen(true)}
            />
          ) : null
        }
        footer={<Button label="Done" onPress={() => router.back()} size="md" />}
      >
        {hydrationError ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="Couldn’t load transaction"
              message="Retry to refresh transaction details."
              actionLabel="Retry"
              onAction={retryHydration}
              className="px-0"
            />
          </View>
        ) : !hydrated ? (
          <View className="mt-2 gap-3">
            <Skeleton height={180} borderRadius={20} />
            <Skeleton height={120} borderRadius={20} />
          </View>
        ) : !tx ? (
          <View className="flex-1 justify-center">
            <EmptyState
              title="Not found"
              message="This transaction may have been deleted."
              className="px-0"
            />
          </View>
        ) : (
          // A receipt, not a dashboard: one unhurried vertical read, no card
          // chrome competing with the numbers.
          <View style={{ flex: 1 }}>
            <View style={{ alignItems: "center", marginTop: tokens.space[6] }}>
              <CategoryIcon icon={categoryMeta.icon} color={categoryMeta.color} size={64} />

              <AppText variant="xl" style={{ marginTop: tokens.space[5] }} numberOfLines={2} className="text-center">
                {tx.title || categoryMeta.name}
              </AppText>

              <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[1] }} numberOfLines={1}>
                {categoryMeta.name}
              </AppText>

              <MoneyAmount
                value={formatCurrency(tx.amountMinor, currency)}
                kind={tx.type}
                size="amount"
                style={{ marginTop: tokens.space[5] }}
              />

              <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[2] }}>
                {dateLabel} · {timeLabel}
              </AppText>
            </View>

            <View
              style={{
                marginTop: tokens.space[7],
                paddingTop: tokens.space[5],
                borderTopWidth: 1,
                borderTopColor: tokens.colors.divider,
              }}
            >
              <AppText variant="xs" tone="muted">
                NOTE
              </AppText>
              <AppText
                variant="base"
                style={{ marginTop: tokens.space[2], color: tx.note?.trim() ? tokens.colors.text : tokens.colors.muted }}
              >
                {tx.note?.trim() ? tx.note.trim() : "No note added."}
              </AppText>
            </View>
          </View>
        )}
      </Sheet>

      <BottomSheetModal visible={menuOpen} onClose={() => setMenuOpen(false)} title="Transaction">
        <View style={{ gap: tokens.space[1] }}>
          <MenuRow
            icon="create-outline"
            label="Edit"
            onPress={() => {
              setPendingAction("edit");
              setMenuOpen(false);
            }}
          />
          <View style={{ height: 1, backgroundColor: tokens.colors.divider }} />
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
