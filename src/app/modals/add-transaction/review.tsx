import { useEffect, useMemo, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import { Sheet } from "@/shared/ui/components/Sheet";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { Button } from "@/shared/ui/components/Button";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { SwipeUpToSubmit } from "@/shared/ui/components/SwipeUpToSubmit";
import { useBooksStore } from "@/features/books/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { useTransactionsStore } from "@/features/transactions/store";
import type { CurrencyCode, PaymentMethod } from "@/shared/types/models";
import { formatCurrency, majorToMinor } from "@/shared/utils/formatCurrency";
import * as transactionsApi from "@/shared/api/transactions";
import { getApiErrorMessage } from "@/shared/api/errors";
import { getAccountEpoch, isCurrentAccountEpoch } from "@/shared/session/accountEpoch";

const COLORS = {
  bg: tokens.colors.app,
  surface: tokens.colors.surface,
  card: tokens.colors.card,
  stroke: tokens.colors.stroke,
  text: tokens.colors.text,
  muted: tokens.colors.muted,
  accent: tokens.colors.accent,
  danger: tokens.colors.danger,
  black: tokens.colors.white,
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
  pill: tokens.radii.pill,
} as const;

const TYPOGRAPHY = tokens.typography;
const SCREEN_HEIGHT = Dimensions.get("window").height;

function parseAmountToMinor(raw: string, currency: CurrencyCode) {
  const cleaned = String(raw || "0")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return majorToMinor(n, currency);
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
      android_ripple={{ color: "#0B122012" }}
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
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showCompletion, setShowCompletion] = useState(false);
  const completion = useSharedValue(0);
  const swipeProgress = useSharedValue(0);

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);

  const draftTitle = useAddTransactionDraftStore((s) => s.title);
  const draftCategoryId = useAddTransactionDraftStore((s) => s.categoryId);
  const draftCategoryName = useAddTransactionDraftStore((s) => s.categoryName);
  const draftNote = useAddTransactionDraftStore((s) => s.note);
  const draftOccurredAt = useAddTransactionDraftStore((s) => s.occurredAt);
  const idempotencyKey = useAddTransactionDraftStore((s) => s.idempotencyKey);

  const params = useLocalSearchParams<{
    amount?: string;
    kind?: string;
    title?: string;
    categoryId?: string;
    categoryName?: string;
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
  const kind: "INCOME" | "EXPENSE" = params.kind === "INCOME" ? "INCOME" : "EXPENSE";

  const title = (draftTitle || params.title || "").trim();
  const categoryId = draftCategoryId || params.categoryId || "";
  const categoryName = (draftCategoryName || params.categoryName || "Uncategorized").trim() || "Uncategorized";
  const note = (draftNote ?? params.note ?? "").trim();
  const occurredAt = draftOccurredAt || params.occurredAt || new Date().toISOString();

  const bookId = selectedBookId || params.bookId || "personal";
  const selectedBook = books.find((b) => b.id === bookId) ?? null;

  const primaryLabel = title.length ? title : categoryName;
  const currency = (selectedBook?.currencyCode ?? "USD") as CurrencyCode;
  const amountMinor = useMemo(() => parseAmountToMinor(amount, currency), [amount, currency]);
  const hasAmountError = amountMinor <= 0 || !Number.isSafeInteger(amountMinor);

  const canSubmit = booksHydrated && !!selectedBook && !hasAmountError && !!categoryId;
  const submitDisabled = !canSubmit || isSubmitting;

  const navigateToSuccess = () => {
    try {
      router.replace({
        pathname: "/modals/add-transaction/success",
        params: {
          amount,
          kind,
          title,
          categoryId,
          categoryName,
          note,
          bookId,
          occurredAt,
          currency,
          paymentMethod: "CASH",
        },
      });
    } catch {
      setIsSubmitting(false);
      setShowCompletion(false);
      completion.value = 0;
    }
  };

  const onSubmit = async () => {
    if (submitDisabled) return;
    const accountEpoch = getAccountEpoch();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        type: kind,
        amountMinor,
        categoryId,
        title: title || undefined,
        note: note || undefined,
        paymentMethod: "CASH" as PaymentMethod,
        occurredAt,
      };
      const tx = await transactionsApi.createTransaction(bookId, idempotencyKey, payload);
      if (!isCurrentAccountEpoch(accountEpoch)) return;
      useTransactionsStore.getState().addTransaction(tx);
      await queryClient.invalidateQueries({ queryKey: ["balance", bookId] });
      await queryClient.invalidateQueries({ queryKey: ["summary", bookId] });
      setShowCompletion(true);
      completion.value = 0;
      completion.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }, () => {
        runOnJS(navigateToSuccess)();
      });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Could not save transaction."));
      setIsSubmitting(false);
      setShowCompletion(false);
    }
  };

  const completionStyle = useAnimatedStyle(() => ({
    opacity: completion.value,
    transform: [{ translateY: SCREEN_HEIGHT * (1 - completion.value) }],
  }));

  const swipeFillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swipeProgress.value, [0, 0.08, 1], [0, 0.28, 1]),
  }));

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title="Review"
        footerVariant="fullBleed"
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#0B122012", borderless: true }}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        footer={
          <SwipeUpToSubmit
            label="Swipe up to submit"
            onSubmit={onSubmit}
            disabled={submitDisabled}
            thresholdPx={160}
            variant="panel"
            panelSafeBottom={insets.bottom}
            progressValue={swipeProgress}
          />
        }
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
              Enter a valid amount greater than zero.
            </AppText>
            <AppText variant="sm" tone="muted" className="mt-2">
              Enter an amount greater than {formatCurrency(0, currency)} before saving.
            </AppText>
            <Button label="Back to amount" variant="ghost" size="md" onPress={() => router.back()} className="mt-4" />
          </Card>
        ) : !selectedBook ? (
          <View className="mt-6 py-8">
            <EmptyState
              title="Cash book unavailable"
              message="Return home and retry once your account data has loaded."
              actionLabel="Return home"
              onAction={() => router.replace("/(tabs)/home")}
              className="px-0"
            />
          </View>
        ) : (
          <>
            <View className="mt-2 items-center">
              <AppText variant="xs" tone="muted" className="uppercase">
                {kind === "INCOME" ? "Income" : "Expense"}
              </AppText>

              <AppText
                variant="amount"
                className="mt-2"
                style={{ color: kind === "INCOME" ? tokens.colors.accent : tokens.colors.text }}
              >
                {formatCurrency(amountMinor, currency)}
              </AppText>

              <AppText variant="lg" className="mt-3" numberOfLines={1}>
                {primaryLabel}
              </AppText>

              <AppText variant="sm" tone="muted" className="mt-1" numberOfLines={1}>
                {categoryName}
              </AppText>
            </View>

            <Card variant="surface" className="mt-6 p-0 overflow-hidden">
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
                onPress={() => router.back()}
              />
              <View className="h-px bg-stroke" />
              <ReviewRow
                label="Category"
                value={categoryId ? categoryName : "Choose a category"}
                onPress={() => router.push("/modals/add-transaction/category")}
                muted={!categoryId}
              />
              <View className="h-px bg-stroke" />
              <ReviewRow
                label="Note"
                value={note.length ? note : "—"}
                muted={!note.length}
                onPress={() => router.push("/modals/add-transaction/note")}
              />
            </Card>

            <Card variant="surface" className="mt-6">
              <AppText variant="sm" tone="muted">
                Summary
              </AppText>
              <SummaryRow label="Amount" value={formatCurrency(amountMinor, currency)} />
            </Card>

            {submitError ? (
              <AppText variant="sm" tone="danger" className="mt-4">
                {submitError}
              </AppText>
            ) : (
              <AppText variant="sm" tone="muted" className="mt-4">
                This is saved instantly and updates Home, Transactions, and Analytics.
              </AppText>
            )}
          </>
        )}
      </Sheet>

      <Animated.View
        pointerEvents="none"
        style={[styles.swipeFill, { bottom: insets.bottom + 80 }, swipeFillStyle]}
      />

      {showCompletion ? (
        <Animated.View pointerEvents="none" style={[styles.completionOverlay, completionStyle]}>
          <View style={styles.completionHandle} />
          <View style={styles.completionContent}>
            <View style={styles.completionBadge}>
              <Ionicons name="checkmark" size={28} color={COLORS.black} />
            </View>
            <AppText variant="2xl" style={styles.completionTitle}>
              Transaction complete
            </AppText>
            <AppText variant="sm" style={styles.completionSubtitle}>
              Updating your books now
            </AppText>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  swipeFill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: COLORS.accent,
  },
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: COLORS.accent,
    paddingTop: SPACING[40],
    paddingHorizontal: SPACING[24],
  },
  completionHandle: {
    width: 48,
    height: 4,
    borderRadius: RADIUS.pill,
    alignSelf: "center",
    backgroundColor: "#00000022",
  },
  completionContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: SPACING[40],
  },
  completionBadge: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF55",
  },
  completionTitle: {
    ...TYPOGRAPHY["2xl"],
    marginTop: SPACING[24],
    color: COLORS.black,
    textAlign: "center",
  },
  completionSubtitle: {
    marginTop: SPACING[8],
    color: COLORS.black,
    opacity: 0.72,
    textAlign: "center",
  },
});
