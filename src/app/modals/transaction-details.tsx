import { useMemo } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { format, parseISO } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { Button } from "@/shared/ui/components/Button";
import { useTransactionsStore } from "@/features/transactions/store";
import { useCategoriesStore } from "@/features/categories/store";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";

function safeDate(iso: string) {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function formatMoneySigned(kind: "income" | "expense", amountCents: number) {
  const sign = kind === "income" ? "+" : "-";
  const dollars = (Math.abs(amountCents) / 100).toFixed(2);
  return `${sign}$${dollars}`;
}

export default function TransactionDetailsModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ id?: string }>();
  const id = String(params.id ?? "");

  const transactions = useTransactionsStore((s) => s.transactions);
  const removeTransaction = useTransactionsStore((s) => s.removeTransaction);
  const categories = useCategoriesStore((s) => s.categories);

  const showDeleted = useUndoToastStore((s) => s.showDeleted);

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

    Haptics.selectionAsync().catch(() => {});

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

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 18 }}>
      {/* Header */}
      <View className="px-6 flex-row items-center justify-between">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            router.back();
          }}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </Pressable>

        <Text className="text-text text-base font-semibold">Transaction</Text>

        <Pressable
          onPress={onDelete}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="trash-outline" size={20} color={tokens.colors.danger} />
        </Pressable>
      </View>

      {!tx ? (
        <View className="flex-1 px-6 items-center justify-center">
          <Text className="text-text text-lg font-semibold">Not found</Text>
          <Text className="text-muted mt-2 text-center">This transaction may have been deleted.</Text>
          <View className="mt-6 w-full">
            <Button label="Done" onPress={() => router.back()} />
          </View>
        </View>
      ) : (
        <>
          {/* Hero */}
          <View className="px-6 mt-10 items-center">
            <View
              className="h-14 w-14 items-center justify-center rounded-3xl border border-stroke"
              style={{ backgroundColor: `${categoryMeta.color}22` }}
            >
              <Ionicons name={categoryMeta.icon} size={26} color={categoryMeta.color} />
            </View>

            <Text className="text-muted mt-4 text-xs uppercase tracking-widest">
              {tx.kind === "income" ? "Income" : "Expense"}
            </Text>

            <Text
              className="mt-2 text-5xl font-semibold"
              style={{ color: tx.kind === "income" ? tokens.colors.accent : tokens.colors.danger }}
            >
              {formatMoneySigned(tx.kind, tx.amountCents)}
            </Text>

            <Text className="text-muted mt-3">{categoryMeta.name}</Text>
          </View>

          {/* Details card */}
          <View className="px-6 mt-8">
            <View className="rounded-3xl border border-stroke bg-surface overflow-hidden">
              <DetailRow label="Payment method" value={(tx.paymentMethod || "cash").toLowerCase()} icon="card-outline" />
              <Divider />
              <DetailRow label="Date" value={dateLabel} icon="calendar-outline" />
              <Divider />
              <DetailRow label="Time" value={timeLabel} icon="time-outline" />
              <Divider />
              <DetailRow label="Currency" value={tx.currency || "USD"} icon="cash-outline" />
              <Divider />
              <DetailRow
                label="Note"
                value={tx.note?.trim() ? tx.note.trim() : "—"}
                icon="chatbubble-ellipses-outline"
                muted={!tx.note?.trim()}
              />
            </View>
          </View>

          {/* Actions */}
          <View className="px-6 mt-auto">
            <Pressable
              onPress={onDelete}
              className="h-12 items-center justify-center rounded-full border"
              style={{ borderColor: "#FF4D4D55" }}
              android_ripple={{ color: "#FF4D4D22" }}
            >
              <Text style={{ color: tokens.colors.danger }} className="font-semibold">
                Delete transaction
              </Text>
            </Pressable>

            <View className="mt-3">
              <Button label="Done" onPress={() => router.back()} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-stroke" />;
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
    <View className="px-5 py-4 flex-row items-center">
      <View className="h-10 w-10 items-center justify-center rounded-2xl border border-stroke bg-card">
        <Ionicons name={icon} size={18} color={tokens.colors.muted} />
      </View>

      <View className="ml-4 flex-1">
        <Text className="text-muted text-xs">{label}</Text>
        <Text
          className="text-text text-base font-semibold mt-1"
          style={{ color: muted ? tokens.colors.muted : tokens.colors.text }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
