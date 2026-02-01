import { useEffect, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NumericKeypad, type Key } from "@/shared/ui/NumericKeypad";
import { tokens } from "@/shared/ui/theme/tokens";
import { useBooksStore } from "@/features/books/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

function clampAmount(next: string) {
  if (!next.includes(".")) return next;
  const [a, b = ""] = next.split(".");
  return `${a}.${b.slice(0, 2)}`;
}

function formatParts(raw: string) {
  const n = Number(raw || "0");
  const fixed = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  const [i, d] = fixed.split(".");
  const intWithSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return { intWithSep, dec: d };
}

function Row({
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
      pressScale={0.995}
      haptic="selection"
      android_ripple={{ color: "#FFFFFF10" }}
      className="px-5 py-4"
    >
      <View className="flex-row items-center justify-between">
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text className="text-muted text-xs">{label}</Text>
          <Text className="text-text text-lg mt-1" numberOfLines={1}>
            {value && value.trim().length ? value : placeholder}
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

  const selectedBook = useMemo(() => {
    return books.find((b) => b.id === selectedBookId) ?? books[0] ?? { id: "personal", name: "Personal" };
  }, [books, selectedBookId]);

  const amount = useAddTransactionDraftStore((s) => s.amount);
  const kind = useAddTransactionDraftStore((s) => s.kind);

  const title = useAddTransactionDraftStore((s) => s.title);
  const category = useAddTransactionDraftStore((s) => s.category);
  const note = useAddTransactionDraftStore((s) => s.note);

  const setAmount = useAddTransactionDraftStore((s) => s.setAmount);
  const setKind = useAddTransactionDraftStore((s) => s.setKind);
  const setBookId = useAddTransactionDraftStore((s) => s.setBookId);
  const reset = useAddTransactionDraftStore((s) => s.reset);

  useEffect(() => {
    setBookId(selectedBook.id);
  }, [selectedBook.id, setBookId]);

  const valueNum = useMemo(() => Number(amount || "0") || 0, [amount]);
  const canReview = valueNum > 0;
  const { intWithSep, dec } = useMemo(() => formatParts(amount), [amount]);

  const close = () => {
    reset();
    const canGoBack = typeof (router as any).canGoBack === "function" ? (router as any).canGoBack() : false;
    if (canGoBack) router.back();
    else router.replace("/(tabs)/home");
  };

  const onKey = (k: Key) => {
    const prev = amount;
    let next = prev;

    if (k === "back") {
      next = prev.length <= 1 ? "0" : prev.slice(0, -1);
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
      },
    });
  };

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 14 }}>
      {/* Top */}
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

        {/* Book */}
        <HapticPressable
          onPress={() => router.push("/modals/book-switcher")}
          className="mt-5 rounded-3xl border border-stroke bg-ink px-5 py-4"
          android_ripple={{ color: "#FFFFFF10" }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-muted text-xs">Book</Text>
              <Text className="text-text text-lg mt-1">{selectedBook.name}</Text>
            </View>
            <Ionicons name="swap-horizontal" size={18} color={tokens.colors.accent} />
          </View>
        </HapticPressable>

        {/* Expense/Income */}
        <View className="mt-6 items-center">
          <View className="flex-row rounded-full border border-stroke bg-surface overflow-hidden">
            <HapticPressable
              onPress={() => setKind("expense")}
              haptic="selection"
              pressScale={0.99}
              className={`px-6 py-3 ${kind === "expense" ? "bg-card" : ""}`}
            >
              <Text className={`${kind === "expense" ? "text-text" : "text-muted"} font-semibold`}>Expense</Text>
            </HapticPressable>

            <HapticPressable
              onPress={() => setKind("income")}
              haptic="selection"
              pressScale={0.99}
              className={`px-6 py-3 ${kind === "income" ? "bg-card" : ""}`}
            >
              <Text className={`${kind === "income" ? "text-text" : "text-muted"} font-semibold`}>Income</Text>
            </HapticPressable>
          </View>
        </View>

        {/* Amount */}
        <View className="items-center mt-8 mb-2">
          <View className="flex-row items-end">
            <Text className="text-text text-3xl font-semibold mr-2 mb-2">$</Text>
            <Text className="text-text text-6xl font-semibold tracking-tight">{intWithSep}</Text>
            <Text className="text-text text-3xl font-semibold ml-2 mb-2">.{dec}</Text>
          </View>
          <Text className="text-muted mt-2">{kind === "expense" ? "Money out" : "Money in"}</Text>
        </View>
      </View>

      {/* Details (grouped, minimal) */}
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 14 }}>
        <View
          style={{
            borderRadius: 24,
            borderWidth: 1,
            borderColor: tokens.colors.stroke,
            backgroundColor: "#000000",
            overflow: "hidden",
          }}
        >
          <Row
            label="Title"
            value={title}
            placeholder="Coffee, Uber, Rent…"
            onPress={() => router.push("/modals/add-transaction/title")}
          />
          <View className="h-px bg-stroke" />

          <Row
            label="Category"
            value={category}
            placeholder="Uncategorized"
            onPress={() => router.push("/modals/add-transaction/category")}
          />
          <View className="h-px bg-stroke" />

          <Row
            label="Note (optional)"
            value={note}
            placeholder="Add details"
            onPress={() => router.push("/modals/add-transaction/note")}
          />
        </View>

        <View style={{ height: 18 }} />
      </ScrollView>

      {/* Review + keypad */}
      <View className="px-6">
        <HapticPressable
          onPress={goReview}
          disabled={!canReview}
          haptic="impactLight"
          pressScale={0.99}
          className={`h-12 items-center justify-center rounded-full ${
            canReview ? "bg-accent" : "bg-surface border border-stroke"
          }`}
          android_ripple={{ color: "#00000022", borderless: false }}
          style={{ opacity: canReview ? 1 : 0.65 }}
        >
          <Text className={`${canReview ? "text-black" : "text-muted"} font-semibold`}>Review</Text>
        </HapticPressable>

        <View className="mt-4">
          <NumericKeypad onKey={onKey} keyHeight={62} containerClassName="px-2" />
        </View>
      </View>
    </View>
  );
}
