import { useEffect, useMemo, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { parseISO, format } from "date-fns";

import { NumericKeypad, type Key } from "@/shared/ui/NumericKeypad";
import { tokens } from "@/shared/ui/theme/tokens";
import { useBooksStore } from "@/features/books/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { OdometerAmount } from "@/shared/ui/components/OdometerAmount";

function clampAmount(next: string) {
  if (!next.includes(".")) return next;
  const [a, b = ""] = next.split(".");
  return `${a}.${b.slice(0, 2)}`;
}

function safeWhenLabel(iso: string) {
  try {
    const d = parseISO(iso);
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return "Now";
  }
}

/**
 * ✅ IMPORTANT: no commas while typing.
 * This keeps column positions stable so only the newly added digit animates.
 */
function formatForTicker(raw: string) {
  const s = String(raw || "0");

  const hasDot = s.includes(".");
  const [intRaw, decRaw = ""] = s.split(".");

  // Keep the int as a plain digit string (no separators)
  const safeInt = (intRaw || "0").replace(/[^\d]/g, "") || "0";

  if (!hasDot) return `$${safeInt}`;

  const d = (decRaw + "00").slice(0, 2);
  return `$${safeInt}.${d}`;
}

function FieldRowTight({
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
  const hasValue = Boolean(value && value.trim().length);

  return (
    <HapticPressable
      onPress={onPress}
      pressScale={0.992}
      className="rounded-3xl border border-stroke bg-ink px-4 py-2"
      android_ripple={{ color: "#FFFFFF10" }}
    >
      <View className="flex-row items-center justify-between">
        <View style={{ flex: 1, paddingRight: 14 }}>
          <Text className="text-muted text-[10px]" style={{ letterSpacing: 0.4 }}>
            {label}
          </Text>
          <Text
            className="mt-[2px]"
            style={{
              color: hasValue ? tokens.colors.text : tokens.colors.muted,
              fontSize: 15,
              fontWeight: "600",
            }}
            numberOfLines={1}
          >
            {hasValue ? value : placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={tokens.colors.muted} />
      </View>
    </HapticPressable>
  );
}

export default function AddTransactionEntry() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);

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

  const didInitRef = useRef(false);

  useFocusEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    resetDraft();
  });

  const selectedBook = useMemo(() => {
    return books.find((b) => b.id === selectedBookId) ?? books[0] ?? { id: "personal", name: "Personal" };
  }, [books, selectedBookId]);

  useEffect(() => {
    setBookId(selectedBook.id);
  }, [selectedBook.id, setBookId]);

  const valueNum = useMemo(() => Number(amount || "0") || 0, [amount]);
  const canReview = valueNum > 0;

  const ticker = useMemo(() => formatForTicker(amount), [amount]);

  const close = () => {
    resetDraft();
    const canGoBack = typeof (router as any).canGoBack === "function" ? (router as any).canGoBack() : false;
    if (canGoBack) router.back();
    else router.replace("/(tabs)/home");
  };

  const onKey = (k: Key) => {
    const prev = amount;
    let next = prev;

    if (k === "back") {
      if (prev.length <= 1) {
        setAmount("0");
        return;
      }
      next = prev.slice(0, -1);
      if (next === "-" || next === "" || next === "0.") next = "0";
      setAmount(next);
      return;
    }

    if (k === ".") {
      if (prev.includes(".")) return;
      setAmount(prev + ".");
      return;
    }

    next = prev === "0" ? k : prev + k;
    next = clampAmount(next);
    setAmount(next);
  };

  const goReview = () => {
    if (!canReview) return;
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

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 12 }}>
      <View className="px-6">
        <View className="relative flex-row items-center justify-center">
          <HapticPressable
            onPress={close}
            className="absolute left-0 h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="close" size={18} color={tokens.colors.text} />
          </HapticPressable>

          <Text className="text-muted text-sm">New transaction</Text>
        </View>

        <HapticPressable
          onPress={() => router.push("/modals/book-switcher")}
          className="mt-4 rounded-3xl border border-stroke bg-ink px-4 py-2"
          android_ripple={{ color: "#FFFFFF10" }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-muted text-[10px]" style={{ letterSpacing: 0.4 }}>
                Book
              </Text>
              <Text className="text-text mt-[2px]" style={{ fontSize: 15, fontWeight: "700" }}>
                {selectedBook.name}
              </Text>
            </View>
            <Ionicons name="swap-horizontal" size={18} color={tokens.colors.accent} />
          </View>
        </HapticPressable>

        <View className="mt-4 items-center">
          <View className="flex-row rounded-full border border-stroke bg-surface overflow-hidden">
            <HapticPressable
              onPress={() => setKind("expense")}
              haptic="selection"
              pressScale={0.99}
              className={`px-6 py-[10px] ${kind === "expense" ? "bg-card" : ""}`}
            >
              <Text className={`${kind === "expense" ? "text-text" : "text-muted"} font-semibold`}>Expense</Text>
            </HapticPressable>

            <HapticPressable
              onPress={() => setKind("income")}
              haptic="selection"
              pressScale={0.99}
              className={`px-6 py-[10px] ${kind === "income" ? "bg-card" : ""}`}
            >
              <Text className={`${kind === "income" ? "text-text" : "text-muted"} font-semibold`}>Income</Text>
            </HapticPressable>
          </View>
        </View>

        <View className="items-center mt-6 mb-1">
          <OdometerAmount value={ticker} majorFontSize={92} minorFontSize={52} color={tokens.colors.text} />
          <Text className="text-muted mt-2">{kind === "expense" ? "Money out" : "Money in"}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 10 }}>
        <View style={{ gap: 8 }}>
          <FieldRowTight
            label="When"
            value={safeWhenLabel(occurredAt)}
            placeholder="Now"
            onPress={() => router.push("/modals/add-transaction/datetime")}
          />
          <FieldRowTight
            label="Title"
            value={title}
            placeholder="e.g. Coffee, Uber, Rent…"
            onPress={() => router.push("/modals/add-transaction/title")}
          />
          <FieldRowTight
            label="Category"
            value={category}
            placeholder="Uncategorized"
            onPress={() => router.push("/modals/add-transaction/category")}
          />
          <FieldRowTight
            label="Note"
            value={note}
            placeholder="Add details"
            onPress={() => router.push("/modals/add-transaction/note")}
          />
        </View>
      </ScrollView>

      <View className="px-6">
        <HapticPressable
          onPress={goReview}
          disabled={!canReview}
          haptic="impactLight"
          pressScale={0.99}
          className={`h-12 items-center justify-center rounded-full ${
            canReview ? "bg-accent" : "bg-surface border border-stroke"
          }`}
          android_ripple={{ color: "#00000022" }}
          style={{ opacity: canReview ? 1 : 0.65 }}
        >
          <Text className={`${canReview ? "text-black" : "text-muted"} font-semibold`}>Review</Text>
        </HapticPressable>

        <View className="mt-3">
          <NumericKeypad onKey={onKey} keyHeight={62} containerClassName="px-2" />
        </View>
      </View>
    </View>
  );
}
