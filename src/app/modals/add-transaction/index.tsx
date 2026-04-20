import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { parseISO, format } from "date-fns";

import { NumericKeypad, type Key } from "@/shared/ui/NumericKeypad";
import { tokens } from "@/shared/ui/theme/tokens";
import { useBooksStore } from "@/features/books/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { useSettingsStore } from "@/features/settings/store";
import { currencySymbol } from "@/shared/utils/formatCurrency";

import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Sheet } from "@/shared/ui/components/Sheet";
import { AppText } from "@/shared/ui/components/AppText";
import { AmountInput, applyAmountKey } from "@/shared/ui/components/AmountInput";
import { Button } from "@/shared/ui/components/Button";
import { EmptyState } from "@/shared/ui/components/EmptyState";

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
  sheet: tokens.radii.xl,
  pill: tokens.radii.pill,
} as const;

const TYPOGRAPHY = tokens.typography;

function safeWhenLabel(iso: string) {
  try {
    const d = parseISO(iso);
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "Now";
  }
}

function FormPressRow({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <HapticPressable
      onPress={onPress}
      haptic="selection"
      pressScale={0.99}
      style={styles.formRow}
      android_ripple={{ color: "#FFFFFF10" }}
    >
      <View style={styles.formLabelWrap}>
        <AppText variant="sm" tone="muted">
          {label}
        </AppText>
        <AppText variant="base" numberOfLines={1} style={{ color: value ? COLORS.text : COLORS.muted }}>
          {value || placeholder}
        </AppText>
      </View>
      <View style={styles.chevronTarget}>
        <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
      </View>
    </HapticPressable>
  );
}

export default function AddTransactionEntry() {
  const router = useRouter();

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const addBook = useBooksStore((s) => s.addBook);
  const setSelectedBookId = useBooksStore((s) => s.setSelectedBookId);
  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);

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
  const [reviewAttempted, setReviewAttempted] = useState(false);

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

  const applyKey = (k: Key) => {
    setAmount(applyAmountKey(amount, k));
  };

  const goReview = () => {
    if (!canReview || !selectedBook) {
      setReviewAttempted(true);
      return;
    }
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
    <View style={styles.screen}>
      <Sheet
        tone="app"
        style={styles.sheet}
        title="New transaction"
        leftAction={
          <HapticPressable
            onPress={close}
            style={styles.closeButton}
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="close" size={18} color={COLORS.text} />
          </HapticPressable>
        }
        footer={
          hasBooks ? (
            <View style={styles.footer}>
              <Button label="Review" onPress={goReview} disabled={!canReview || !selectedBook} size="lg" />
              {/* This divider separates the action area from number entry without adding another card. */}
              <View style={styles.footerDivider} />
              <NumericKeypad
                onPress={(key) => applyKey(key as Key)}
                onDelete={() => applyKey("back")}
                decimalAllowed
                disabled={!selectedBook}
              />
            </View>
          ) : null
        }
      >
        {!hasBooks ? (
          <EmptyState
            title="No books yet"
            message="Create a book to start tracking transactions."
            actionLabel="Create a book"
            onAction={createDefaultBook}
            className="px-0"
          />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <HapticPressable
              onPress={() => router.push("/modals/book-switcher")}
              haptic="selection"
              pressScale={0.99}
              style={styles.bookPill}
              android_ripple={{ color: "#FFFFFF10", borderless: true }}
            >
              <Ionicons name="albums-outline" size={16} color={COLORS.muted} />
              <AppText variant="sm" style={styles.bookText} numberOfLines={1}>
                {selectedBook?.name ?? "Select book"}
              </AppText>
              <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
            </HapticPressable>

            <View style={styles.segmented}>
              {(["expense", "income"] as const).map((item) => {
                const active = kind === item;
                return (
                  <HapticPressable
                    key={item}
                    onPress={() => setKind(item)}
                    haptic="selection"
                    pressScale={0.99}
                    style={[styles.segment, active ? styles.segmentActive : null]}
                  >
                    <AppText variant="sm" style={[styles.segmentText, { color: active ? COLORS.text : COLORS.muted }]}>
                      {item === "expense" ? "Expense" : "Income"}
                    </AppText>
                  </HapticPressable>
                );
              })}
            </View>

            <View style={styles.amountBlock}>
              <AmountInput
                value={amount}
                kind={kind}
                currencySymbol={currencySymbol(primaryCurrency)}
                helperText={kind === "expense" ? "Money out" : "Money in"}
                error={reviewAttempted && valueNum <= 0 ? "Amount is required." : undefined}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.titleRow}>
                <View style={styles.formLabelWrap}>
                  <AppText variant="sm" tone="muted">
                    Title
                  </AppText>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Coffee, Uber, Rent"
                    placeholderTextColor={COLORS.muted}
                    autoCapitalize="words"
                    returnKeyType="done"
                    style={styles.titleInput}
                  />
                </View>
              </View>
              <View style={styles.divider} />
              <FormPressRow
                label="When"
                value={safeWhenLabel(occurredAt)}
                placeholder="Now"
                onPress={() => router.push("/modals/add-transaction/datetime")}
              />
              <View style={styles.divider} />
              <FormPressRow
                label="Category"
                value={category}
                placeholder="Uncategorized"
                onPress={() => router.push("/modals/add-transaction/category")}
              />
              <View style={styles.divider} />
              <FormPressRow
                label="Note"
                value={note}
                placeholder="Add details"
                onPress={() => router.push("/modals/add-transaction/note")}
              />
            </View>
          </ScrollView>
        )}
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
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingBottom: SPACING[24],
  },
  bookPill: {
    minHeight: 44,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING[16],
    gap: SPACING[8],
  },
  bookText: {
    maxWidth: 220,
    color: COLORS.text,
  },
  segmented: {
    alignSelf: "center",
    flexDirection: "row",
    marginTop: SPACING[24],
    padding: SPACING[4],
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
  },
  segment: {
    minHeight: 44,
    minWidth: 112,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: SPACING[20],
  },
  segmentActive: {
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.card,
  },
  segmentText: {
    fontFamily: "Inter_600SemiBold",
  },
  amountBlock: {
    marginTop: SPACING[32],
    alignItems: "center",
  },
  formGroup: {
    marginTop: SPACING[32],
    overflow: "hidden",
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.surface,
  },
  titleRow: {
    minHeight: 64,
    justifyContent: "center",
    paddingHorizontal: SPACING[16],
    paddingVertical: SPACING[8],
  },
  formRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: SPACING[16],
  },
  formLabelWrap: {
    flex: 1,
    gap: SPACING[4],
  },
  titleInput: {
    ...TYPOGRAPHY.base,
    minHeight: 28,
    color: COLORS.text,
    padding: SPACING[0],
  },
  chevronTarget: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    marginLeft: SPACING[16],
    backgroundColor: COLORS.stroke,
  },
  footer: {
    gap: SPACING[16],
  },
  footerDivider: {
    height: 1,
    backgroundColor: COLORS.stroke,
  },
});
