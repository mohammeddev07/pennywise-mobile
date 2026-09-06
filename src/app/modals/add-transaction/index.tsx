import { useCallback, useEffect, useMemo, useRef } from "react";
import { useWindowDimensions, View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { NumericKeypad, type Key } from "@/shared/ui/NumericKeypad";
import { amountFontSize, tokens } from "@/shared/ui/theme/tokens";
import { amountColor } from "@/shared/ui/theme/money";
import { useBooksStore } from "@/features/books/store";
import { useBookCurrency } from "@/features/books/useBookCurrency";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { currencyMinorUnitDigits, currencySymbol } from "@/shared/utils/formatCurrency";

import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { FlowHeader } from "@/shared/ui/components/FlowHeader";
import { OdometerAmount } from "@/shared/ui/components/OdometerAmount";
import { TypeToggle } from "@/shared/ui/components/TypeToggle";
import { useScreenPaddingX } from "@/shared/ui/components/Screen";
import { applyAmountKey, formatForTicker } from "@/shared/ui/components/AmountInput";

/**
 * Step 1 of 2: the amount, and nothing else.
 *
 * Everything secondary (title, category, date, note) lives on step 2 so this
 * screen is a single decision - type the number, pick a direction, continue.
 */
export default function AddTransactionAmount() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const paddingX = useScreenPaddingX();

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);

  const amount = useAddTransactionDraftStore((s) => s.amount);
  const kind = useAddTransactionDraftStore((s) => s.kind);
  const setAmount = useAddTransactionDraftStore((s) => s.setAmount);
  const setKind = useAddTransactionDraftStore((s) => s.setKind);
  const setBookId = useAddTransactionDraftStore((s) => s.setBookId);
  const resetDraft = useAddTransactionDraftStore((s) => s.reset);

  const didInitRef = useRef(false);

  // Only clear the draft the first time this screen is focused; coming back
  // from step 2 to correct the number must not wipe what was typed there.
  useFocusEffect(
    useCallback(() => {
      if (didInitRef.current) return;
      didInitRef.current = true;
      resetDraft();
    }, [resetDraft])
  );

  const hasBooks = books.length > 0;
  const selectedBook = useMemo(
    () => (hasBooks ? (books.find((b) => b.id === selectedBookId) ?? books[0]) : undefined),
    [books, selectedBookId, hasBooks]
  );

  const currency = useBookCurrency(selectedBook?.id);
  const fractionDigits = currencyMinorUnitDigits(currency);

  useEffect(() => {
    if (!selectedBook) return;
    setBookId(selectedBook.id);
  }, [selectedBook, setBookId]);

  const formattedAmount = formatForTicker(amount, currencySymbol(currency), fractionDigits);

  // Display-L is 72px and steps down past six digits, but OdometerAmount lays
  // digits out at a fixed width each, so a long amount could still run past the
  // screen edge on a narrow handset. Take the smaller of the two limits rather
  // than letting the figure clip or wrap.
  const heroFontSize = useMemo(() => {
    const base = amountFontSize(formattedAmount);
    const available = width - paddingX * 2;
    const estimated = formattedAmount.length * base * 0.6;
    if (estimated <= available) return base;
    return Math.max(28, Math.floor(base * (available / estimated)));
  }, [formattedAmount, paddingX, width]);

  const valueNum = Number(amount || "0") || 0;
  const canContinue = valueNum > 0 && Boolean(selectedBook);
  const isExpense = kind === "EXPENSE";

  const close = () => {
    resetDraft();
    const canGoBack = typeof router.canGoBack === "function" ? router.canGoBack() : false;
    if (canGoBack) router.back();
    else router.replace("/(tabs)/home");
  };

  const goNext = () => {
    if (!canContinue) return;
    router.push("/modals/add-transaction/details");
  };

  // An invalid action is the one failure the product reports by feel: pressing
  // Continue at zero says no without moving the screen.
  const rejectContinue = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.colors.app,
        paddingTop: insets.top + tokens.layout.screenPadTop,
      }}
    >
      {/*
        The screen itself carries the mode. A wash no stronger than 10% at the
        top edge means expense and income are legible from across the room,
        without asking the amount's color to do the work alone.
      */}
      <LinearGradient
        pointerEvents="none"
        colors={(isExpense ? tokens.ambient.expense : tokens.ambient.income) as unknown as [string, string]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 360 }}
      />

      <View style={{ paddingHorizontal: paddingX }}>
        <FlowHeader
          title="New transaction"
          subtitle="Amount · 1 of 2"
          onBack={close}
          backIcon="close"
          step={1}
          totalSteps={2}
          progressColor={amountColor(kind)}
        />
      </View>

      {!hasBooks ? (
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: paddingX }}>
          <EmptyState
            title="Cash book unavailable"
            message="Return home and retry once your account data has loaded."
            actionLabel="Return home"
            tone="danger"
            onAction={() => router.replace("/(tabs)/home")}
          />
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: paddingX, marginTop: tokens.space[6] }}>
            <TypeToggle value={kind} onChange={setKind} />
          </View>

          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: paddingX,
            }}
          >
            <OdometerAmount
              value={formattedAmount}
              majorFontSize={heroFontSize}
              minorFontSize={Math.round(heroFontSize * 0.5)}
              // The hero takes the money color of the selected direction, so
              // expense and income are distinguishable before the save.
              color={valueNum > 0 ? amountColor(kind) : tokens.colors.subtle}
            />

            <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[4] }}>
              {currency} · {kind === "EXPENSE" ? "Expense" : "Income"}
            </AppText>
          </View>

          <View
            style={{
              paddingHorizontal: paddingX,
              paddingBottom: insets.bottom + tokens.space[4],
              gap: tokens.space[5],
            }}
          >
            <NumericKeypad
              onPress={(key) => setAmount(applyAmountKey(amount, key as Key, fractionDigits))}
              onDelete={() => setAmount(applyAmountKey(amount, "back", fractionDigits))}
              decimalAllowed={fractionDigits > 0}
              disabled={!selectedBook}
            />
            {/*
              The CTA is the mode's color, not the brand's: in expense mode it
              is coral, so the commitment matches what is about to be recorded.
            */}
            <Button
              label="Next"
              onPress={goNext}
              disabled={!canContinue}
              onDisabledPress={rejectContinue}
              size="lg"
              tone={isExpense ? "expense" : "accent"}
            />
          </View>
        </>
      )}
    </View>
  );
}
