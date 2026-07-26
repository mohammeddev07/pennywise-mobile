import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Sheet } from "@/shared/ui/components/Sheet";
import { normalizePaymentMethod, type PaymentMethod, type TransactionKind } from "@/features/transactions/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { formatSignedCurrency } from "@/shared/utils/formatCurrency";

const COLORS = {
  bg: tokens.colors.app,
  surface: tokens.colors.surface,
  card: tokens.colors.card,
  stroke: tokens.colors.stroke,
  text: tokens.colors.text,
  muted: tokens.colors.muted,
  accent: tokens.colors.accent,
  danger: tokens.colors.danger,
} as const;

const SPACING = {
  0: tokens.space[0],
  4: tokens.space[1],
  8: tokens.space[2],
  12: tokens.space[3],
  16: tokens.space[4],
  20: tokens.space[5],
  24: tokens.space[6],
  32: tokens.space[7],
  40: tokens.space[8],
} as const;

const RADIUS = {
  input: tokens.radii.md,
  card: tokens.radii.lg,
  pill: tokens.radii.pill,
} as const;

const TYPOGRAPHY = tokens.typography;

function parseAmountToCents(raw: string) {
  const cleaned = String(raw || "0")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function normalizeOccurredAt(raw?: string) {
  if (!raw) return new Date().toISOString();
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return new Date().toISOString();
  return new Date(t).toISOString();
}

export default function AddTransactionSuccess() {
  const router = useRouter();

  const resetDraft = useAddTransactionDraftStore((s) => s.reset);

  const params = useLocalSearchParams<{
    amount?: string;
    kind?: string;
    title?: string;
    categoryName?: string;
    note?: string;
    bookId?: string;
    occurredAt?: string;
    currency?: string;
    paymentMethod?: string;
  }>();

  const amount = params.amount ?? "0";
  const kind: TransactionKind = params.kind === "INCOME" ? "INCOME" : "EXPENSE";

  const title = (params.title ?? "").trim();
  const category = (params.categoryName ?? "Uncategorized").trim() || "Uncategorized";
  const note = (params.note ?? "").trim() || undefined;

  const bookId = params.bookId ?? "personal";
  const occurredAt = normalizeOccurredAt(params.occurredAt);

  const currency = params.currency ?? "USD";
  const paymentMethod: PaymentMethod = normalizePaymentMethod(params.paymentMethod);

  const cents = useMemo(() => parseAmountToCents(amount), [amount]);

  const didAddRef = useRef(false);
  const [status, setStatus] = useState<"saving" | "saved" | "error">("saving");

  const saveTransaction = useCallback(() => {
    try {
      resetDraft();
      setStatus("saved");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setStatus("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [
    bookId,
    category,
    cents,
    currency,
    kind,
    note,
    occurredAt,
    paymentMethod,
    resetDraft,
    title,
  ]);

  useEffect(() => {
    if (didAddRef.current) return;
    didAddRef.current = true;
    saveTransaction();
  }, [saveTransaction]);

  return (
    <View style={styles.screen}>
      <Sheet
        tone="app"
        style={styles.sheet}
        title=""
        footer={
          <View style={styles.footer}>
            <Button
              label="Go to home"
              onPress={() => router.replace("/(tabs)/home")}
              disabled={status !== "saved"}
              size="lg"
            />
            <Button
              label="Add another"
              variant="ghost"
              onPress={() => router.replace("/modals/add-transaction")}
              disabled={status !== "saved"}
              size="md"
            />
          </View>
        }
      >
        <View style={styles.content}>
          {status === "saving" ? (
            <Card variant="surface" style={styles.statusCard}>
              <ActivityIndicator color={COLORS.accent} />
              <AppText variant="lg" style={styles.statusTitle}>
                Saving transaction
              </AppText>
              <AppText variant="sm" tone="muted" style={styles.centerText}>
                Your books will update immediately.
              </AppText>
            </Card>
          ) : null}

          {status === "saved" ? (
            <View style={styles.savedWrap}>
              {/* Low-opacity accent wash gives the success state presence without adding heavy decoration. */}
              <View pointerEvents="none" style={styles.accentGlow} />
              <Card variant="surface" style={styles.savedCard}>
                <View style={styles.badge}>
                  <AppText variant="sm" style={styles.badgeText}>
                    Success
                  </AppText>
                </View>
                <AppText
                  variant="amount"
                  style={[styles.amount, { color: kind === "INCOME" ? COLORS.accent : COLORS.text }]}
                >
                  {formatSignedCurrency(kind === "EXPENSE" ? -cents : cents, currency)}
                </AppText>
                <AppText variant="lg" style={styles.transactionName} numberOfLines={1}>
                  {title ? title : category}
                </AppText>
                <AppText variant="sm" tone="muted" style={styles.centerText}>
                  {currency} · Saved to your book
                </AppText>
              </Card>
            </View>
          ) : null}

          {status === "error" ? (
            <View style={styles.errorWrap}>
              <EmptyState
                title="Couldn’t save transaction"
                message="Try saving again. Your draft is still intact."
                actionLabel="Retry save"
                onAction={saveTransaction}
                className="px-0"
              />
              <Button label="Back to review" variant="ghost" size="md" onPress={() => router.back()} className="mt-4" />
            </View>
          ) : null}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  sheet: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    width: "100%",
    alignItems: "center",
  },
  statusTitle: {
    marginTop: SPACING[16],
    textAlign: "center",
  },
  centerText: {
    marginTop: SPACING[8],
    textAlign: "center",
  },
  savedWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  accentGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accent,
    opacity: 0.07,
  },
  savedCard: {
    width: "100%",
    alignItems: "center",
    overflow: "hidden",
  },
  badge: {
    minHeight: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: `${COLORS.accent}26`,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING[16],
  },
  badgeText: {
    color: COLORS.accent,
    fontFamily: "Inter_600SemiBold",
  },
  amount: {
    ...TYPOGRAPHY.amount,
    marginTop: SPACING[24],
  },
  transactionName: {
    marginTop: SPACING[16],
    textAlign: "center",
  },
  errorWrap: {
    width: "100%",
    paddingVertical: SPACING[32],
  },
  footer: {
    gap: SPACING[12],
  },
});
