import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Sheet } from "@/shared/ui/components/Sheet";
import {
  normalizePaymentMethod,
  useTransactionsStore,
  type PaymentMethod,
  type TransactionKind,
} from "@/features/transactions/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import type { CurrencyCode } from "@/shared/types/models";
import { isCurrencyCode } from "@/features/transactions/store";
import { formatSignedCurrency } from "@/shared/utils/formatCurrency";

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

  const addTransaction = useTransactionsStore((s) => s.addTransaction);
  const resetDraft = useAddTransactionDraftStore((s) => s.reset);

  const params = useLocalSearchParams<{
    amount?: string;
    kind?: string;
    title?: string;
    category?: string;
    note?: string;
    bookId?: string;
    occurredAt?: string;
    currency?: string;
    paymentMethod?: string;
  }>();

  const amount = params.amount ?? "0";
  const kind: TransactionKind = params.kind === "income" ? "income" : "expense";

  const title = (params.title ?? "").trim();
  const category = (params.category ?? "Uncategorized").trim() || "Uncategorized";
  const note = (params.note ?? "").trim() || undefined;

  const bookId = params.bookId ?? "personal";
  const occurredAt = normalizeOccurredAt(params.occurredAt);

  const currency: CurrencyCode = isCurrencyCode(params.currency) ? (params.currency as CurrencyCode) : "USD";
  const paymentMethod: PaymentMethod = normalizePaymentMethod(params.paymentMethod);

  const cents = useMemo(() => parseAmountToCents(amount), [amount]);

  const didAddRef = useRef(false);
  const [status, setStatus] = useState<"saving" | "saved" | "error">("saving");

  const saveTransaction = useCallback(() => {
    try {
      addTransaction({
        bookId,
        kind,
        amountCents: cents,
        currency,
        title: title.length ? title : category,
        category,
        note,
        paymentMethod,
        occurredAt,
      });

      resetDraft();
      setStatus("saved");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setStatus("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [
    addTransaction,
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
    <View className="flex-1 bg-ink">
      <Sheet
        tone="ink"
        className="flex-1"
        title="Success"
        footer={
          <View className="gap-3">
            <Button
              label="Go to home"
              onPress={() => router.replace("/(tabs)/home")}
              disabled={status !== "saved"}
              size="md"
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
        <View className="flex-1 items-center justify-center">
          {status === "saving" ? (
            <Card variant="surface" className="w-full items-center">
              <ActivityIndicator color={tokens.colors.accent} />
              <AppText variant="lg" className="mt-4 text-center">
                Saving transaction...
              </AppText>
              <AppText variant="sm" tone="muted" className="mt-2 text-center">
                Your data will appear across tabs immediately.
              </AppText>
            </Card>
          ) : null}

          {status === "saved" ? (
            <Card variant="surface" className="w-full items-center">
              <AppText variant="2xl" className="text-center">
                Transaction logged
              </AppText>
              <AppText
                variant="amount"
                className="mt-4"
                style={{ color: kind === "income" ? tokens.colors.accent : tokens.colors.text }}
              >
                {formatSignedCurrency(kind === "expense" ? -cents : cents, currency)}
              </AppText>
              <AppText variant="base" className="mt-3 text-center" numberOfLines={1}>
                {title ? title : category}
              </AppText>
              <AppText variant="sm" tone="muted" className="mt-1 text-center">
                {currency} • Saved
              </AppText>
            </Card>
          ) : null}

          {status === "error" ? (
            <View className="w-full py-8">
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
