import { useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { format, parseISO } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { Button } from "@/shared/ui/components/Button";
import { useTransactionsStore } from "@/features/transactions/store";
import { useCategoriesStore } from "@/features/categories/store";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { Sheet } from "@/shared/ui/components/Sheet";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
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

function DetailRow({
  label,
  value,
  icon,
  muted,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  muted?: boolean;
}) {
  return (
    <View className="px-4 py-3 flex-row items-center">
      <View className="h-10 w-10 items-center justify-center rounded-lg border border-stroke bg-card">
        <Ionicons name={icon} size={18} color={tokens.colors.muted} />
      </View>

      <View className="ml-3 flex-1">
        <AppText variant="xs" tone="muted">
          {label}
        </AppText>
        <AppText variant="base" className="mt-1" style={{ color: muted ? tokens.colors.muted : tokens.colors.text }}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

export default function TransactionDetailsModal() {
  const router = useRouter();

  const params = useLocalSearchParams<{ id?: string }>();
  const id = String(params.id ?? "");

  const transactions = useTransactionsStore((s) => s.transactions);
  const removeTransaction = useTransactionsStore((s) => s.removeTransaction);
  const duplicateTransaction = useTransactionsStore((s) => s.duplicateTransaction);
  const categories = useCategoriesStore((s) => s.categories);

  const showDeleted = useUndoToastStore((s) => s.showDeleted);

  const txPersist = (useTransactionsStore as any).persist;
  const [hydrated, setHydrated] = useState<boolean>(() => {
    const has = txPersist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });
  const [hydrationError, setHydrationError] = useState(false);

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
    const name = tx?.category ?? "Uncategorized";
    const hit = categories.find((c) => c.name === name);
    return {
      name,
      icon: (hit?.icon as any) ?? ("pricetag-outline" as any),
      color: hit?.color ?? tokens.colors.muted,
    };
  }, [categories, tx]);

  const occurred = tx?.occurredAt ? safeDate(tx.occurredAt) : null;
  const dateLabel = occurred ? format(occurred, "MMM d, yyyy") : "—";
  const timeLabel = occurred ? format(occurred, "h:mm a") : "—";

  const onDelete = () => {
    if (!tx) return;

    Alert.alert("Delete transaction?", "You can undo for a few seconds after deleting.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const idx = useTransactionsStore.getState().transactions.findIndex((t) => t.id === tx.id);
          removeTransaction(tx.id);
          showDeleted(tx, idx >= 0 ? idx : 0);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          router.back();
        },
      },
    ]);
  };

  const onDuplicate = () => {
    if (!tx) return;
    const duplicatedId = duplicateTransaction(tx.id);
    if (duplicatedId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace({ pathname: "/modals/transaction-details", params: { id: duplicatedId } });
    }
  };

  const onEdit = () => {
    if (!tx) return;
    router.push({ pathname: "/modals/edit-transaction", params: { id: tx.id } });
  };

  const retryHydration = () => {
    setHydrationError(false);
    setHydrated(txPersist?.hasHydrated?.() ?? true);
    txPersist?.rehydrate?.();
  };

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title="Transaction Details"
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#0B122012", borderless: true }}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        rightAction={
          tx ? (
            <HapticPressable
              onPress={onEdit}
              className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
              android_ripple={{ color: "#0B122012", borderless: true }}
            >
              <Ionicons name="create-outline" size={20} color={tokens.colors.accent} />
            </HapticPressable>
          ) : null
        }
        footer={
          tx ? (
            <View className="gap-3">
              <Button label="Edit" onPress={onEdit} size="md" />
              <Button label="Duplicate" variant="outline" onPress={onDuplicate} size="md" />
              <Button label="Delete" variant="danger" onPress={onDelete} size="md" />
              <Button label="Done" onPress={() => router.back()} size="md" />
            </View>
          ) : (
            <Button label="Done" onPress={() => router.back()} size="md" />
          )
        }
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
            <Skeleton height={180} borderRadius={24} />
            <Skeleton height={240} borderRadius={24} />
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
          <>
            <Card variant="surface" className="mt-2 items-center overflow-hidden">
              <View
                className="h-24 w-24 items-center justify-center rounded-full"
                style={{ backgroundColor: `${categoryMeta.color}22` }}
              >
                <Ionicons name={categoryMeta.icon} size={44} color={categoryMeta.color} />
              </View>

              <View className="mt-5 rounded-full px-4 py-2" style={{ backgroundColor: tx.kind === "income" ? tokens.colors.greenSoft : tokens.colors.redSoft }}>
                <AppText variant="sm" style={{ color: tx.kind === "income" ? tokens.colors.accent : tokens.colors.danger, fontFamily: "Inter_600SemiBold" }}>
                  {tx.kind === "income" ? "Income" : "Expense"}
                </AppText>
              </View>

              <AppText variant="2xl" className="mt-5" numberOfLines={1}>
                {tx.title || categoryMeta.name}
              </AppText>

              <AppText variant="base" tone="muted" className="mt-2" numberOfLines={1}>
                {categoryMeta.name}
              </AppText>

              <AppText
                variant="amount"
                className="mt-4"
                style={{ color: tx.kind === "income" ? tokens.colors.accent : tokens.colors.text }}
              >
                {formatSignedCurrency(tx.kind === "income" ? tx.amountCents : -tx.amountCents, tx.currency)}
              </AppText>

              <AppText variant="base" tone="muted" className="mt-2">
                {dateLabel} • {timeLabel}
              </AppText>
            </Card>

            <View className="mt-6">
              <AppText variant="lg">Transaction Details</AppText>
            </View>

            <Card variant="surface" className="mt-3 p-0 overflow-hidden">
              <DetailRow label="Title" value={tx.title || "—"} icon="create-outline" muted={!tx.title} />
              <View className="h-px bg-stroke" />
              <DetailRow label="Payment method" value={(tx.paymentMethod || "cash").toLowerCase()} icon="card-outline" />
              <View className="h-px bg-stroke" />
              <DetailRow label="Date" value={dateLabel} icon="calendar-outline" />
              <View className="h-px bg-stroke" />
              <DetailRow label="Time" value={timeLabel} icon="time-outline" />
              <View className="h-px bg-stroke" />
              <DetailRow label="Currency" value={tx.currency || "USD"} icon="cash-outline" />
              <View className="h-px bg-stroke" />
              <DetailRow
                label="Note"
                value={tx.note?.trim() ? tx.note.trim() : "—"}
                icon="chatbubble-ellipses-outline"
                muted={!tx.note?.trim()}
              />
            </Card>
          </>
        )}
      </Sheet>
    </View>
  );
}
