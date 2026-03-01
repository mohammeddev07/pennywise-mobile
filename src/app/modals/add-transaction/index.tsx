import { useEffect, useMemo, useRef } from "react";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { parseISO, format } from "date-fns";

import { NumericKeypad, type Key } from "@/shared/ui/NumericKeypad";
import { tokens } from "@/shared/ui/theme/tokens";
import { useBooksStore } from "@/features/books/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";

import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Sheet } from "@/shared/ui/components/Sheet";
import { AppText } from "@/shared/ui/components/AppText";
import { SelectRow } from "@/shared/ui/components/SelectRow";
import { AmountInput, applyAmountKey } from "@/shared/ui/components/AmountInput";
import { Button } from "@/shared/ui/components/Button";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { SwipeUpToSubmit } from "@/shared/ui/components/SwipeUpToSubmit";
import { Input } from "@/shared/ui/components/Input";

function safeWhenLabel(iso: string) {
  try {
    const d = parseISO(iso);
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "Now";
  }
}

export default function AddTransactionEntry() {
  const router = useRouter();

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const addBook = useBooksStore((s) => s.addBook);
  const setSelectedBookId = useBooksStore((s) => s.setSelectedBookId);

  const resetDraft = useAddTransactionDraftStore((s) => s.reset);

  const amount = useAddTransactionDraftStore((s) => s.amount);
  const kind = useAddTransactionDraftStore((s) => s.kind);
  const occurredAt = useAddTransactionDraftStore((s) => s.occurredAt);

  const title = useAddTransactionDraftStore((s) => s.title);
  const category = useAddTransactionDraftStore((s) => s.category);
  const note = useAddTransactionDraftStore((s) => s.note);

  const setAmount = useAddTransactionDraftStore((s) => s.setAmount);
  const setKind = useAddTransactionDraftStore((s) => s.setKind);
  const setBookId = useAddTransactionDraftStore((s) => s.setBookId);
  const setTitle = useAddTransactionDraftStore((s) => s.setTitle);

  const didInitRef = useRef(false);

  useFocusEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    resetDraft();
  });

  const hasBooks = books.length > 0;

  const selectedBook = useMemo(() => {
    if (!hasBooks) return undefined;
    return books.find((b) => b.id === selectedBookId) ?? books[0];
  }, [books, selectedBookId, hasBooks]);

  useEffect(() => {
    if (!selectedBook) return;
    setBookId(selectedBook.id);
  }, [selectedBook?.id, setBookId, selectedBook]);

  const valueNum = useMemo(() => Number(amount || "0") || 0, [amount]);
  const canReview = valueNum > 0;

  const close = () => {
    resetDraft();
    const canGoBack = typeof (router as any).canGoBack === "function" ? (router as any).canGoBack() : false;
    if (canGoBack) router.back();
    else router.replace("/(tabs)/home");
  };

  const onKey = (k: Key) => {
    const next = applyAmountKey(amount, k);
    setAmount(next);
  };

  const goReview = () => {
    if (!canReview || !selectedBook) return;
    router.push({
      pathname: "/modals/add-transaction/review",
      params: {
        amount,
        kind,
        title,
        category,
        note,
        bookId: selectedBook.id,
        occurredAt,
      },
    });
  };

  const createDefaultBook = () => {
    const id = addBook({ name: "Personal" });
    setSelectedBookId(id);
    setBookId(id);
  };

  return (
    <View className="flex-1 bg-ink">
      <Sheet
        tone="ink"
        className="flex-1"
        title="New transaction"
        leftAction={
          <HapticPressable
            onPress={close}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="close" size={18} color={tokens.colors.text} />
          </HapticPressable>
        }
        footer={
          <SwipeUpToSubmit
            label="Swipe up to review"
            onSubmit={goReview}
            disabled={!canReview || !selectedBook}
          >
            <View>
              <Button label="Review" onPress={goReview} disabled={!canReview || !selectedBook} size="md" />
              <View className="mt-3">
                <NumericKeypad onKey={onKey} keyHeight={62} containerClassName="px-0" />
              </View>
            </View>
          </SwipeUpToSubmit>
        }
      >
        {!hasBooks ? (
          <EmptyState
            title="No books yet"
            message="Create a book to start tracking transactions."
            actionLabel="Create a book"
            onAction={createDefaultBook}
          />
        ) : (
          <>
            <SelectRow
              label="Book"
              value={selectedBook?.name}
              placeholder="Select book"
              onPress={() => router.push("/modals/book-switcher")}
              className="mt-2"
            />

            <View className="mt-6 items-center">
              <View className="flex-row rounded-full border border-stroke bg-surface overflow-hidden">
                <HapticPressable
                  onPress={() => setKind("expense")}
                  haptic="selection"
                  pressScale={0.99}
                  className={`px-6 h-12 items-center justify-center ${kind === "expense" ? "bg-card" : ""}`}
                >
                  <AppText variant="sm" className={kind === "expense" ? "text-text" : "text-muted"}>
                    Expense
                  </AppText>
                </HapticPressable>

                <HapticPressable
                  onPress={() => setKind("income")}
                  haptic="selection"
                  pressScale={0.99}
                  className={`px-6 h-12 items-center justify-center ${kind === "income" ? "bg-card" : ""}`}
                >
                  <AppText variant="sm" className={kind === "income" ? "text-text" : "text-muted"}>
                    Income
                  </AppText>
                </HapticPressable>
              </View>
            </View>

            <View className="items-center mt-8">
              <AmountInput
                value={amount}
                kind={kind}
                currencySymbol="$"
                majorFontSize={72}
                minorFontSize={36}
                helperText={kind === "expense" ? "Money out" : "Money in"}
              />
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 24 }}>
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="Title (optional)"
                autoCapitalize="words"
                returnKeyType="done"
              />

              <View className="mt-4 gap-2">
                <SelectRow
                  label="When"
                  value={safeWhenLabel(occurredAt)}
                  placeholder="Now"
                  onPress={() => router.push("/modals/add-transaction/datetime")}
                />
                <SelectRow
                  label="Category"
                  value={category}
                  placeholder="Uncategorized"
                  onPress={() => router.push("/modals/add-transaction/category")}
                />
                <SelectRow
                  label="Note"
                  value={note}
                  placeholder="Add details"
                  onPress={() => router.push("/modals/add-transaction/note")}
                />
              </View>
            </ScrollView>
          </>
        )}
      </Sheet>
    </View>
  );
}
