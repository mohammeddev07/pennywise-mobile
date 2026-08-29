import { useCallback, useEffect, useMemo, useRef } from "react";
import { useWindowDimensions, View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NumericKeypad, type Key } from "@/shared/ui/NumericKeypad";
import { tokens } from "@/shared/ui/theme/tokens";
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

  // The hero is 60px by default, but OdometerAmount lays digits out at a fixed
  // width each, so a long amount would run past the screen edge. Scale the type
  // down just enough to fit rather than letting it clip or wrap.
  const heroFontSize = useMemo(() => {
    const base = tokens.typography.display.fontSize;
    const available = width - tokens.layout.screenPaddingX * 2;
    const estimated = formattedAmount.length * base * 0.6;
    if (estimated <= available) return base;
    return Math.max(28, Math.floor(base * (available / estimated)));
  }, [formattedAmount, width]);

  const valueNum = Number(amount || "0") || 0;
  const canContinue = valueNum > 0 && Boolean(selectedBook);

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

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + tokens.space[3] }}>
      <View className="px-6">
        <FlowHeader title="New transaction" onBack={close} backIcon="close" step={1} totalSteps={2} />
      </View>

      {!hasBooks ? (
        <View className="flex-1 justify-center px-6">
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
          <View className="flex-1 items-center justify-center px-6">
            <TypeToggle value={kind} onChange={setKind} />

            <View className="mt-8 w-full items-center">
              <OdometerAmount
                value={formattedAmount}
                majorFontSize={heroFontSize}
                minorFontSize={Math.round(heroFontSize * 0.5)}
                color={valueNum > 0 ? amountColor(kind) : tokens.colors.muted}
              />
            </View>

            <AppText variant="sm" tone="muted" className="mt-4">
              {currency} · {kind === "EXPENSE" ? "Money out" : "Money in"}
            </AppText>
          </View>

          <View className="px-6" style={{ paddingBottom: insets.bottom + tokens.space[4], gap: tokens.space[5] }}>
            <NumericKeypad
              onPress={(key) => setAmount(applyAmountKey(amount, key as Key, fractionDigits))}
              onDelete={() => setAmount(applyAmountKey(amount, "back", fractionDigits))}
              decimalAllowed={fractionDigits > 0}
              disabled={!selectedBook}
            />
            <Button label="Next" onPress={goNext} disabled={!canContinue} size="lg" />
          </View>
        </>
      )}
    </View>
  );
}
