import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, isSameDay, parseISO, subDays } from "date-fns";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import type { Transaction } from "@/features/transactions/store";
import { useTransactionsStore } from "@/features/transactions/store";
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

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, v));
}

export function TransactionRow({ item }: { item: Transaction }) {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const duplicateTransaction = useTransactionsStore((s) => s.duplicateTransaction);
  const removeTransaction = useTransactionsStore((s) => s.removeTransaction);
  const showDeleted = useUndoToastStore((s) => s.showDeleted);

  const isIncome = item.kind === "income";
  const amount = moneySigned(item.kind, item.amountCents);

  const primary = (item.title || "").trim() || (item.category || "").trim() || "Transaction";
  const category = (item.category || "Uncategorized").trim() || "Uncategorized";

  // gesture state
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isSwiping = useSharedValue(false);
  const dismissing = useSharedValue(false);
  const didThresholdHaptic = useSharedValue(false);

  const MAX = 96;
  const THRESH = 64;

  const hapticThreshold = () => {
    Haptics.selectionAsync().catch(() => {});
  };

  const commitDelete = () => {
    const idx = useTransactionsStore.getState().transactions.findIndex((t) => t.id === item.id);
    removeTransaction(item.id);
    showDeleted(item, idx >= 0 ? idx : 0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  };

  const commitDuplicate = () => {
    duplicateTransaction(item.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const pan = Gesture.Pan()
    .minDistance(8)
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      isSwiping.value = true;
    })
    .onUpdate((e) => {
      if (dismissing.value) return;

      const next = clamp(e.translationX, -MAX, MAX);
      translateX.value = next;

      const p = Math.abs(next) / THRESH;
      if (!didThresholdHaptic.value && p >= 1) {
        didThresholdHaptic.value = true;
        runOnJS(hapticThreshold)();
      }
      if (didThresholdHaptic.value && p < 0.82) {
        didThresholdHaptic.value = false;
      }
    })
    .onEnd((e) => {
      if (dismissing.value) return;

      const x = translateX.value;

      if (x <= -THRESH) {
        dismissing.value = true;

        translateX.value = withTiming(-width, {
          duration: 170,
          easing: Easing.out(Easing.cubic),
        });

        opacity.value = withTiming(0, { duration: 170 }, (finished) => {
          if (!finished) return;
          runOnJS(commitDelete)();
        });

        return;
      }

      if (x >= THRESH) {
        translateX.value = withSpring(0, { damping: 18, stiffness: 240 });
        didThresholdHaptic.value = false;
        runOnJS(commitDuplicate)();
        return;
      }

      translateX.value = withSpring(0, { damping: 18, stiffness: 240 });
      didThresholdHaptic.value = false;
    })
    .onFinalize(() => {
      isSwiping.value = false;
    });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionStyle = useAnimatedStyle(() => {
    const x = translateX.value;
    const p = interpolate(x, [0, THRESH, MAX], [0, 1, 1], Extrapolate.CLAMP);
    return { opacity: p };
  });

  const rightActionStyle = useAnimatedStyle(() => {
    const x = translateX.value;
    const p = interpolate(x, [0, -THRESH, -MAX], [0, 1, 1], Extrapolate.CLAMP);
    return { opacity: p };
  });

  return (
    <GestureDetector gesture={pan}>
      <View style={{ borderRadius: 18, overflow: "hidden" }}>
        {/* Underlay */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "#0E141B",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
          }}
        >
          <Animated.View style={[{ flexDirection: "row", alignItems: "center" }, leftActionStyle]}>
            <View
              style={{
                height: 36,
                width: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#00C80522",
                borderWidth: 1,
                borderColor: tokens.colors.stroke,
              }}
            >
              <Ionicons name="copy-outline" size={18} color={tokens.colors.accent} />
            </View>
            <Text style={{ color: tokens.colors.accent, marginLeft: 10, fontWeight: "800" }}>Duplicate</Text>
          </Animated.View>

          <Animated.View style={[{ flexDirection: "row", alignItems: "center" }, rightActionStyle]}>
            <Text style={{ color: tokens.colors.danger, marginRight: 10, fontWeight: "800" }}>Delete</Text>
            <View
              style={{
                height: 36,
                width: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#FF4D4D22",
                borderWidth: 1,
                borderColor: tokens.colors.stroke,
              }}
            >
              <Ionicons name="trash-outline" size={18} color={tokens.colors.danger} />
            </View>
          </Animated.View>
        </View>

        {/* Foreground */}
        <Animated.View
          style={[
            {
              backgroundColor: tokens.colors.surface,
              borderWidth: 1,
              borderColor: tokens.colors.stroke,
              borderRadius: 18,
              paddingHorizontal: 16,
            },
            cardStyle,
          ]}
        >
          <Pressable
            onPress={() => {
              if (isSwiping.value || dismissing.value || Math.abs(translateX.value) > 2) return;
              Haptics.selectionAsync().catch(() => {});
              router.push({ pathname: "/modals/transaction-details", params: { id: item.id } });
            }}
            android_ripple={{ color: "#FFFFFF10" }}
            style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
          >
            <View style={{ paddingVertical: 18, flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  height: 44,
                  width: 44,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: tokens.colors.stroke,
                  backgroundColor: tokens.colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={isIncome ? "arrow-down" : "arrow-up"}
                  size={18}
                  color={isIncome ? tokens.colors.accent : tokens.colors.danger}
                />
              </View>

              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text className="text-text text-base font-semibold" numberOfLines={1}>
                  {primary}
                </Text>

                <Text className="text-muted mt-1" numberOfLines={1}>
                  {category} • {(item.paymentMethod || "cash").toLowerCase()} • {whenLabel(item.occurredAt)} •{" "}
                  {timeLabel(item.occurredAt)}
                </Text>
              </View>

              <Text className="text-base font-semibold" style={{ color: isIncome ? tokens.colors.accent : tokens.colors.danger }}>
                {amount}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
