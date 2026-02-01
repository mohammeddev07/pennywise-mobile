import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/shared/ui/theme/tokens";
import { SwipeUpToSubmit } from "@/shared/ui/components/SwipeUpToSubmit";
import { useBooksStore } from "@/features/books/store";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

function parseAmountToCents(raw: string) {
  const cleaned = String(raw || "0").replace(/,/g, "").replace(/[^\d.-]/g, "");
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

export default function AddTransactionReview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);

  const draftTitle = useAddTransactionDraftStore((s) => s.title);
  const draftCategory = useAddTransactionDraftStore((s) => s.category);
  const draftNote = useAddTransactionDraftStore((s) => s.note);

  const params = useLocalSearchParams<{
    amount?: string;
    kind?: string;
    title?: string;
    category?: string;
    note?: string;
    bookId?: string;
  }>();

  const amount = params.amount ?? "0";
  const kind = params.kind === "income" ? "income" : "expense";

  const title = (draftTitle || params.title || "").trim();
  const category = (draftCategory || params.category || "Uncategorized").trim() || "Uncategorized";
  const note = (draftNote ?? params.note ?? "").trim();

  const bookId = selectedBookId ?? params.bookId ?? "personal";
  const bookName = books.find((b) => b.id === bookId)?.name ?? "Personal";

  const amountCents = useMemo(() => parseAmountToCents(amount), [amount]);
  const feeCents = 0;
  const totalCents = amountCents + feeCents;

  const primaryLabel = title.length ? title : category;

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top + 10 }}>
      {/* Top bar */}
      <View className="px-6 flex-row items-center justify-between">
        <HapticPressable
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </HapticPressable>

        <Text style={{ color: tokens.colors.accent }} className="text-xs font-extrabold tracking-widest">
          REVIEW
        </Text>

        <View className="h-12 w-12" />
      </View>

      {/* Hero */}
      <View className="items-center mt-10 px-6">
        <Text className="text-muted text-xs uppercase tracking-widest">{kind === "income" ? "Income" : "Expense"}</Text>

        <View className="mt-4">
          <Text className="text-text text-6xl font-semibold tracking-tight">
            {formatMoney2(kind === "expense" ? -amountCents : amountCents).replace("-", "")}
          </Text>
        </View>

        <Text className="text-text mt-4 text-lg font-semibold" numberOfLines={1}>
          {primaryLabel}
        </Text>
        <Text className="text-muted mt-1">{title ? category : "Uncategorized"}</Text>
      </View>

      {/* Details card */}
      <View className="mt-8 px-6">
        <View
          style={{
            borderRadius: 24,
            borderWidth: 1,
            borderColor: tokens.colors.stroke,
            backgroundColor: tokens.colors.surface,
            overflow: "hidden",
          }}
        >
          <RowPress
            left="Book"
            right={bookName}
            onPress={() => router.push("/modals/book-switcher")}
            rightIcon={<Ionicons name="swap-horizontal" size={16} color={tokens.colors.accent} />}
          />
          <Divider />

          <RowPress left="Title" right={title ? title : "—"} muted={!title} onPress={() => router.push("/modals/add-transaction/title")} />
          <Divider />

          <RowPress left="Category" right={category} onPress={() => router.push("/modals/add-transaction/category")} />
          <Divider />

          <RowPress left="Note" right={note ? note : "—"} muted={!note} onPress={() => router.push("/modals/add-transaction/note")} />
        </View>

        {/* Order summary */}
        <View className="mt-7">
          <Text className="text-text text-base font-semibold">Order summary</Text>

          <SummaryRow label="Amount" value={formatMoney2(amountCents)} />
          <SummaryRow label="Fees" value={formatMoney2(feeCents)} />
          <View className="h-px bg-stroke mt-4" />
          <SummaryRow label="Total" value={formatMoney2(totalCents)} strong />
        </View>

        <Text className="text-muted mt-5 leading-6">
          This will be added to <Text className="text-text">{bookName}</Text> and reflected immediately across Home,
          Transactions, and Analytics.
        </Text>
      </View>

      {/* Swipe */}
      <SwipeUpToSubmit
        label="Swipe up to confirm"
        onSubmit={() =>
          router.replace({
            pathname: "/modals/add-transaction/success",
            params: {
              amount,
              kind,
              title,
              category,
              note,
              bookId,
              // important: make it deterministic for storage + analytics
              occurredAt: new Date().toISOString(),
              currency: "USD",
              paymentMethod: "cash",
            },
          })
        }
      />
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-stroke" />;
}

function RowPress({
  left,
  right,
  muted,
  onPress,
  rightIcon,
}: {
  left: string;
  right: string;
  muted?: boolean;
  onPress: () => void;
  rightIcon?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} android_ripple={{ color: "#FFFFFF10" }} className="px-5 py-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-text text-base font-semibold">{left}</Text>

        <View className="flex-row items-center" style={{ maxWidth: "60%" }}>
          <Text
            className="text-text text-base"
            style={{ color: muted ? tokens.colors.muted : tokens.colors.text }}
            numberOfLines={1}
          >
            {right}
          </Text>
          {rightIcon ? <View style={{ marginLeft: 10 }}>{rightIcon}</View> : <Ionicons name="chevron-forward" size={18} color={tokens.colors.muted} style={{ marginLeft: 8 }} />}
        </View>
      </View>
    </Pressable>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between mt-4">
      <Text className="text-muted">{label}</Text>
      <Text className={strong ? "text-text font-semibold" : "text-text"}>{value}</Text>
    </View>
  );
}
