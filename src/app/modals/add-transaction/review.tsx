import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { format, parseISO } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { Sheet } from "@/shared/ui/components/Sheet";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { Button } from "@/shared/ui/components/Button";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { useBooksStore } from "@/features/books/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { useSettingsStore } from "@/features/settings/store";
import type { CurrencyCode } from "@/shared/types/models";

function parseAmountToCents(raw: string) {
  const cleaned = String(raw || "0")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function formatMoney2(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(2);
  const [i, d] = dollars.split(".");
  const intWithSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${intWithSep}.${d}`;
}

function safeWhen(iso: string) {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return "Now";
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "Now";
  }
}

function ReviewRow({
  label,
  value,
  onPress,
  muted,
}: {
  label: string;
  value: string;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <HapticPressable
      onPress={onPress}
      haptic="selection"
      pressScale={0.99}
      className="min-h-14 px-4 py-3 flex-row items-center"
      android_ripple={{ color: "#FFFFFF10" }}
    >
      <View className="flex-1 pr-3">
        <AppText variant="sm" tone="muted">
          {label}
        </AppText>
        <AppText variant="base" className="mt-0.5" style={{ color: muted ? tokens.colors.muted : tokens.colors.text }} numberOfLines={1}>
          {value}
        </AppText>
      </View>

      <View className="h-12 w-12 items-center justify-center">
        <Ionicons name="chevron-forward" size={18} color={tokens.colors.muted} />
      </View>
    </HapticPressable>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="mt-3 flex-row items-center justify-between">
      <AppText variant="sm" tone="muted">
        {label}
      </AppText>
      <AppText variant="base" style={strong ? { fontFamily: "Inter_600SemiBold" } : undefined}>
        {value}
      </AppText>
    </View>
  );
}

export default function AddTransactionReview() {
  const router = useRouter();

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);

  const draftTitle = useAddTransactionDraftStore((s) => s.title);
  const draftCategory = useAddTransactionDraftStore((s) => s.category);
  const draftNote = useAddTransactionDraftStore((s) => s.note);
  const draftOccurredAt = useAddTransactionDraftStore((s) => s.occurredAt);

  const params = useLocalSearchParams<{
    amount?: string;
    kind?: string;
    title?: string;
    category?: string;
    note?: string;
    bookId?: string;
    occurredAt?: string;
  }>();

  const booksPersist = (useBooksStore as any).persist;
  const [booksHydrated, setBooksHydrated] = useState<boolean>(() => {
    const has = booksPersist?.hasHydrated?.();
    return typeof has === "boolean" ? has : true;
  });

  useEffect(() => {
    if (!booksPersist?.onFinishHydration) return;
    const unsub = booksPersist.onFinishHydration(() => setBooksHydrated(true));
    if (booksPersist?.hasHydrated && !booksPersist.hasHydrated()) {
      booksPersist?.rehydrate?.();
    }
    return () => unsub?.();
  }, [booksPersist]);

  const amount = params.amount ?? "0";
  const kind = params.kind === "income" ? "income" : "expense";

  const title = (draftTitle || params.title || "").trim();
  const category = (draftCategory || params.category || "Uncategorized").trim() || "Uncategorized";
  const note = (draftNote ?? params.note ?? "").trim();
  const occurredAt = draftOccurredAt || params.occurredAt || new Date().toISOString();

  const bookId = selectedBookId ?? params.bookId ?? "personal";
  const selectedBook = books.find((b) => b.id === bookId) ?? null;

  const amountCents = useMemo(() => parseAmountToCents(amount), [amount]);
  const feeCents = 0;
  const totalCents = amountCents + feeCents;

  const primaryLabel = title.length ? title : category;
  const currency: CurrencyCode = primaryCurrency;
  const hasAmountError = amountCents <= 0;

  const canSubmit = booksHydrated && !!selectedBook && !hasAmountError;

  const onSubmit = () => {
    if (!canSubmit) return;
    router.replace({
      pathname: "/modals/add-transaction/success",
      params: {
        amount,
        kind,
        title,
        category,
        note,
        bookId,
        occurredAt,
        currency,
        paymentMethod: "cash",
      },
    });
  };

  return (
    <View className="flex-1 bg-ink">
      <Sheet
        tone="ink"
        className="flex-1"
        title="Review"
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        footer={<Button label="Confirm" onPress={onSubmit} size="md" disabled={!canSubmit} />}
      >
        {!booksHydrated ? (
          <View className="mt-2 gap-3">
            <Skeleton height={160} borderRadius={24} />
            <Skeleton height={240} borderRadius={24} />
            <Skeleton height={120} borderRadius={24} />
          </View>
        ) : hasAmountError ? (
          <Card variant="surface" className="mt-2">
            <AppText variant="base" tone="danger">
              Amount is required.
            </AppText>
            <AppText variant="sm" tone="muted" className="mt-2">
              Enter an amount greater than $0.00 before saving.
            </AppText>
            <Button label="Back to amount" variant="ghost" size="md" onPress={() => router.back()} className="mt-4" />
          </Card>
        ) : !selectedBook ? (
          <View className="mt-6 py-8">
            <EmptyState
              title="Book not found"
              message="Pick an active book to save this transaction."
              actionLabel="Choose book"
              onAction={() => router.push("/modals/book-switcher")}
              className="px-0"
            />
          </View>
        ) : (
          <>
            <View className="mt-2 items-center">
              <AppText variant="xs" tone="muted" className="uppercase">
                {kind === "income" ? "Income" : "Expense"}
              </AppText>

              <AppText
                variant="amount"
                className="mt-2"
                style={{ color: kind === "income" ? tokens.colors.accent : tokens.colors.text }}
              >
                {formatMoney2(kind === "expense" ? -amountCents : amountCents).replace("-", "")}
              </AppText>

              <AppText variant="lg" className="mt-3" numberOfLines={1}>
                {primaryLabel}
              </AppText>

              <AppText variant="sm" tone="muted" className="mt-1" numberOfLines={1}>
                {title ? category : "Uncategorized"}
              </AppText>
            </View>

            <Card variant="surface" className="mt-6 p-0 overflow-hidden">
              <ReviewRow label="Book" value={selectedBook.name} onPress={() => router.push("/modals/book-switcher")} />
              <View className="h-px bg-stroke" />
              <ReviewRow
                label="When"
                value={safeWhen(occurredAt)}
                onPress={() => router.push("/modals/add-transaction/datetime")}
              />
              <View className="h-px bg-stroke" />
              <ReviewRow
                label="Title"
                value={title.length ? title : "—"}
                muted={!title.length}
                onPress={() => router.push("/modals/add-transaction/title")}
              />
              <View className="h-px bg-stroke" />
              <ReviewRow
                label="Category"
                value={category}
                onPress={() => router.push("/modals/add-transaction/category")}
              />
              <View className="h-px bg-stroke" />
              <ReviewRow
                label="Note"
                value={note.length ? note : "—"}
                muted={!note.length}
                onPress={() => router.push("/modals/add-transaction/note")}
              />
              <View className="h-px bg-stroke" />
              <ReviewRow
                label="Currency"
                value={currency}
                onPress={() => router.push("/(onboarding)/currency")}
              />
            </Card>

            <Card variant="surface" className="mt-6">
              <AppText variant="sm" tone="muted">
                Order summary
              </AppText>
              <SummaryRow label="Amount" value={formatMoney2(amountCents)} />
              <SummaryRow label="Fees" value={formatMoney2(feeCents)} />
              <View className="mt-3 h-px bg-stroke" />
              <SummaryRow label="Total" value={formatMoney2(totalCents)} strong />
            </Card>

            <AppText variant="sm" tone="muted" className="mt-4">
              This is saved instantly and updates Home, Transactions, and Analytics.
            </AppText>
          </>
        )}
      </Sheet>
    </View>
  );
}
