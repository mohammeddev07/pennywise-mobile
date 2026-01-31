import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, isSameDay, parseISO, subDays } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import type { Transaction } from "@/features/transactions/store";

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
  if (!d) return "";
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

function moneySigned(kind: Transaction["kind"], amountCents: number) {
  const sign = kind === "income" ? "+" : "-";
  const dollars = (Math.abs(amountCents) / 100).toFixed(2);
  return `${sign}$${dollars}`;
}

export function TransactionRow({ item }: { item: Transaction }) {
  const isIncome = item.kind === "income";
  const amount = moneySigned(item.kind, item.amountCents);

  return (
    <Pressable
      onPress={() => {}}
      className="py-5 flex-row items-center"
      android_ripple={{ color: "#FFFFFF10" }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="h-12 w-12 rounded-full border border-stroke bg-surface items-center justify-center">
        <Ionicons
          name={isIncome ? "arrow-down" : "arrow-up"}
          size={18}
          color={isIncome ? tokens.colors.accent : "#FF4D4D"}
        />
      </View>

      <View className="ml-4 flex-1">
        <Text className="text-text text-base font-semibold" numberOfLines={1}>
          {item.category || "Uncategorized"}
        </Text>
        <Text className="text-muted mt-1" numberOfLines={1}>
          {(item.paymentMethod || "cash").toLowerCase()} • {whenLabel(item.occurredAt)} • {timeLabel(item.occurredAt)}
        </Text>
      </View>

      <Text
        className="text-base font-semibold"
        style={{ color: isIncome ? tokens.colors.accent : "#FF4D4D" }}
      >
        {amount}
      </Text>
    </Pressable>
  );
}
