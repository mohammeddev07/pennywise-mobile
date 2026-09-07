import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { format, isSameDay, parseISO, subDays } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { amountColor } from "@/shared/ui/theme/money";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { Card } from "@/shared/ui/components/Card";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { SuccessCheck } from "@/shared/ui/components/SuccessCheck";
import { useScreenPaddingX } from "@/shared/ui/components/Screen";
import type { TransactionKind } from "@/features/transactions/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { useBooksStore } from "@/features/books/store";
import { formatCurrency, majorToMinor } from "@/shared/utils/formatCurrency";

function parseAmountToMinor(raw: string, currency: string) {
  const cleaned = String(raw || "0")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return majorToMinor(n, currency);
}

function whenLabel(iso?: string) {
  if (!iso) return "";
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const day = isSameDay(d, now) ? "Today" : isSameDay(d, subDays(now, 1)) ? "Yesterday" : format(d, "MMM d");
    return `${day}, ${format(d, "h:mm a")}`;
  } catch {
    return "";
  }
}

/**
 * Confirmation for a transaction that is already persisted - `details` saves,
 * then replaces to here. This screen only reports and clears the draft, so it
 * has no failure state of its own.
 */
export default function AddTransactionSuccess() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const paddingX = useScreenPaddingX();
  const resetDraft = useAddTransactionDraftStore((s) => s.reset);
  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const bookName = useMemo(
    () => books.find((b) => b.id === selectedBookId)?.name ?? "your cash book",
    [books, selectedBookId]
  );

  const params = useLocalSearchParams<{
    amount?: string;
    kind?: string;
    title?: string;
    categoryName?: string;
    currency?: string;
    occurredAt?: string;
  }>();

  const kind: TransactionKind = params.kind === "INCOME" ? "INCOME" : "EXPENSE";
  const currency = params.currency ?? "USD";
  const category = (params.categoryName ?? "Uncategorized").trim() || "Uncategorized";
  const title = (params.title ?? "").trim();
  const amountMinor = useMemo(
    () => parseAmountToMinor(params.amount ?? "0", currency),
    [params.amount, currency]
  );
  const when = whenLabel(params.occurredAt);

  const didFinishRef = useRef(false);
  useEffect(() => {
    if (didFinishRef.current) return;
    didFinishRef.current = true;
    resetDraft();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [resetDraft]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.colors.app,
        paddingHorizontal: paddingX,
        paddingTop: insets.top + tokens.space[6],
        paddingBottom: insets.bottom + tokens.space[4],
      }}
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <SuccessCheck />

        {/*
          The moment is choreographed rather than simultaneous: check, then
          headline, then receipt, then actions. Each beat is short and the
          whole sequence lands inside the success budget, so the screen is
          still by the time the user reaches for a button.
        */}
        <Animated.View entering={FadeInDown.duration(tokens.motion.base).delay(240)}>
          <AppText variant="2xl" style={{ marginTop: tokens.space[6] }}>
            Logged
          </AppText>
          <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[2], textAlign: "center" }}>
            {/* The success sub-line is one of the four places emoji are allowed. */}
            Saved to {bookName} — totals are up to date ✨
          </AppText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(tokens.motion.slow).delay(360)}
          style={{ marginTop: tokens.space[7], width: "100%" }}
        >
          <Card variant="surface" padding={20}>
            <AppText variant="xs" style={{ color: amountColor(kind) }}>
              {kind === "INCOME" ? "INCOME" : "EXPENSE"}
            </AppText>

            <MoneyAmount
              value={formatCurrency(amountMinor, currency)}
              kind={kind}
              size="amount"
              style={{ marginTop: tokens.space[2] }}
            />

            <View
              style={{
                height: 1,
                backgroundColor: tokens.colors.divider,
                marginVertical: tokens.space[4],
              }}
            />

            <AppText variant="base" weight="semibold" numberOfLines={1}>
              {title || category}
            </AppText>
            <AppText variant="sm" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
              {[category, when].filter(Boolean).join(" · ")}
            </AppText>
          </Card>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeIn.duration(tokens.motion.base).delay(450)}
        style={{ gap: tokens.space[3] }}
      >
        <Button
          label="Add another"
          variant="secondary"
          size="lg"
          onPress={() => router.replace("/modals/add-transaction")}
        />
        <Button label="Done" size="lg" onPress={() => router.replace("/(tabs)/home")} />
      </Animated.View>
    </View>
  );
}
