import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { format, isSameDay, parseISO, startOfDay, subDays } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { BookPill } from "@/shared/ui/components/BookPill";
import { useTransactionsStore, type Transaction } from "@/features/transactions/store";
import { TransactionRow } from "@/shared/ui/components/TransactionRow";
import { useBooksStore } from "@/features/books/store";

type RangeKey = "today" | "week" | "month" | "all";

type Row =
  | { type: "header"; id: string; title: string }
  | { type: "tx"; id: string; tx: Transaction };

function inRange(tx: Transaction, range: RangeKey) {
  if (range === "all") return true;

  const d = safeDate(tx.occurredAt);
  if (!d) return false;

  const now = new Date();

  if (range === "today") return isSameDay(d, now);

  if (range === "week") {
    const since = startOfDay(subDays(now, 6));
    return d >= since;
  }

  const since = startOfDay(subDays(now, 29));
  return d >= since;
}

function safeDate(iso: string) {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function dayTitle(d: Date) {
  const now = new Date();
  if (isSameDay(d, now)) return "Today";
  if (isSameDay(d, subDays(now, 1))) return "Yesterday";
  return format(d, "MMM d");
}

function money(amountCents: number) {
  const abs = Math.abs(amountCents);
  return (abs / 100).toFixed(2);
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();

  const transactions = useTransactionsStore((s) => s.transactions);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const books = useBooksStore((s) => s.books);

  const selectedBookName = useMemo(() => {
    return books.find((b) => b.id === selectedBookId)?.name ?? "Personal";
  }, [books, selectedBookId]);

  const [range, setRange] = useState<RangeKey>("today");
  const [query, setQuery] = useState("");

  const bookTransactions = useMemo(() => {
    return transactions.filter((t) => t.bookId === selectedBookId);
  }, [transactions, selectedBookId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return bookTransactions.filter((tx) => {
      if (!inRange(tx, range)) return false;
      if (!q) return true;

      const hay = [
        tx.title ?? "",
        tx.category ?? "",
        tx.note ?? "",
        tx.paymentMethod ?? "",
        tx.kind ?? "",
        tx.currency ?? "",
        money(tx.amountCents),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [bookTransactions, range, query]);

  const rows = useMemo<Row[]>(() => {
    const sorted = [...filtered].sort((a, b) => {
      const da = safeDate(a.occurredAt)?.getTime() ?? 0;
      const db = safeDate(b.occurredAt)?.getTime() ?? 0;
      return db - da;
    });

    const out: Row[] = [];
    let lastKey = "";

    for (const tx of sorted) {
      const d = safeDate(tx.occurredAt) ?? new Date();
      const key = format(d, "yyyy-MM-dd");

      if (key !== lastKey) {
        lastKey = key;
        out.push({ type: "header", id: `h_${key}`, title: dayTitle(d) });
      }

      out.push({ type: "tx", id: tx.id, tx });
    }

    return out;
  }, [filtered]);

  return (
    <View className="flex-1 bg-app" style={{ paddingTop: insets.top + 10 }}>
      <View className="px-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-text text-2xl font-semibold">Transactions</Text>
            <View className="mt-3 self-start">
              <BookPill label={selectedBookName} onPress={() => router.push("/modals/book-switcher")} />
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/modals/add-transaction")}
            className="h-11 w-11 items-center justify-center rounded-full border border-stroke bg-surface"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="add" size={22} color={tokens.colors.accent} />
          </Pressable>
        </View>

        <View className="mt-5 flex-row items-center rounded-2xl border border-stroke bg-surface px-4 py-3">
          <Ionicons name="search" size={18} color={tokens.colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search title, category, note…"
            placeholderTextColor={tokens.colors.muted}
            className="ml-3 flex-1 text-text"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery("")}
              className="h-9 w-9 items-center justify-center rounded-full"
              android_ripple={{ color: "#FFFFFF10", borderless: true }}
            >
              <Ionicons name="close" size={18} color={tokens.colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <View className="mt-4 flex-row items-center gap-3">
          <Chip label="Today" active={range === "today"} onPress={() => setRange("today")} />
          <Chip label="Week" active={range === "week"} onPress={() => setRange("week")} />
          <Chip label="Month" active={range === "month"} onPress={() => setRange("month")} />
          <Chip label="All" active={range === "all"} onPress={() => setRange("all")} />
        </View>

        <View className="h-px bg-stroke mt-5" />
      </View>

      <View className="flex-1 px-6">
        <FlashList
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => {
            if (item.type === "header") return <SectionHeader title={item.title} />;
            return <TransactionRow item={item.tx} />;
          }}
          ItemSeparatorComponent={() => <View className="h-px bg-stroke" />}
          contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 22, paddingTop: 14 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="pt-5 pb-3">
      <Text className="text-muted text-xs uppercase tracking-widest">{title}</Text>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full border px-4 py-2"
      android_ripple={{ color: "#FFFFFF10" }}
      style={{
        borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
        backgroundColor: active ? "#00C80522" : "transparent",
      }}
    >
      <Text className="text-sm font-semibold" style={{ color: active ? tokens.colors.accent : tokens.colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
