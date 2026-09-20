import { View } from "react-native";
import { format, parseISO } from "date-fns";
import { router } from "expo-router";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Icon } from "@/shared/ui/components/Icon";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { QueryField } from "@/shared/types/transactionQuery";
import { paymentMethodLabel, type Transaction } from "../model";
import { sanitizeSort, type SortState } from "../filterModel";

/** Narrower than this and the table scrolls sideways instead of squeezing its columns. */
export const TABLE_MIN_WIDTH = 680;

type Column = { field: QueryField; label: string; width?: number; align?: "right"; first: "ASC" | "DESC" };

// A flex column (no width) takes the leftover space; the rest are fixed so headers and rows line up.
const COLUMNS: Column[] = [
  { field: "occurredOn", label: "Date", width: 92, first: "DESC" },
  { field: "title", label: "Description", first: "ASC" },
  { field: "categoryName", label: "Category", width: 160, first: "ASC" },
  { field: "paymentMethod", label: "Payment", width: 112, first: "ASC" },
  { field: "amountMinor", label: "Amount", width: 136, align: "right", first: "DESC" },
];

const cell = (c: Column) => (c.width ? { width: c.width } : { flex: 1, minWidth: 0 });

/**
 * Header click -> the next sort. Same column flips direction, a new column starts at its natural
 * direction; date is the tie-breaker so equal values keep a stable, newest-first order. This is the same
 * `SortState` the phone's sort sheet edits - one query state, two ways to change it.
 */
export function nextSort(sort: SortState, field: QueryField, first: "ASC" | "DESC"): SortState {
  const cur = sort[0] ?? { field: "occurredOn" as const, direction: "DESC" as const };
  const direction = cur.field === field ? (cur.direction === "ASC" ? "DESC" : "ASC") : first;
  return sanitizeSort([{ field, direction }, ...(field === "occurredOn" ? [] : [{ field: "occurredOn" as const, direction: "DESC" as const }])]);
}

export function TableHeader({ sort, onSort }: { sort: SortState; onSort: (next: SortState) => void }) {
  const cur = sort[0] ?? { field: "occurredOn", direction: "DESC" };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: tokens.colors.divider }}>
      {COLUMNS.map((c) => {
        const active = cur.field === c.field;
        const dir = active ? (cur.direction === "ASC" ? "ascending" : "descending") : null;
        return (
          <HapticPressable
            key={c.field}
            onPress={() => onSort(nextSort(sort, c.field, c.first))}
            haptic="none"
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${c.label}${dir ? `, currently ${dir}` : ""}`}
            accessibilityState={{ selected: active }}
            style={[
              cell(c),
              { minHeight: tokens.layout.minTap, flexDirection: "row", alignItems: "center", gap: tokens.space[1] },
              c.align === "right" ? { justifyContent: "flex-end" } : null,
            ]}
          >
            <AppText variant="xs" style={{ color: active ? tokens.colors.text : tokens.colors.muted }}>
              {c.label.toUpperCase()}
            </AppText>
            {/* The arrow is the non-colour cue for the active column and its direction. */}
            {active ? <Icon name={cur.direction === "ASC" ? "arrow-up" : "arrow-down"} size={tokens.icon.chip} color={tokens.colors.text} /> : null}
          </HapticPressable>
        );
      })}
    </View>
  );
}

function dateText(tx: Transaction) {
  try {
    return format(parseISO(tx.occurredOn), "MMM d, yyyy");
  } catch {
    return tx.occurredOn;
  }
}

export function TableRow({
  tx,
  currency,
  categoryColor,
  divider,
}: {
  tx: Transaction;
  currency: string;
  categoryColor?: string;
  divider: boolean;
}) {
  const category = (tx.categoryName || "Uncategorized").trim() || "Uncategorized";
  const title = (tx.title || "").trim() || category;
  const money = formatCurrency(tx.amountMinor, currency);
  return (
    <HapticPressable
      onPress={() => router.push({ pathname: "/modals/transaction-details", params: { id: tx.id, bookId: tx.bookId } })}
      haptic="none"
      pressScale={0.998}
      pressOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${category}, ${tx.type === "INCOME" ? "income" : "expense"} ${money}, ${dateText(tx)}`}
      android_ripple={{ color: tokens.colors.ripple }}
      style={{
        minHeight: tokens.layout.listRowHeight - tokens.space[3],
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: tokens.colors.divider,
      }}
    >
      <View style={cell(COLUMNS[0])}>
        <AppText variant="sm" tone="muted" numberOfLines={1}>
          {dateText(tx)}
        </AppText>
      </View>
      <View style={[cell(COLUMNS[1]), { paddingRight: tokens.space[3] }]}>
        <AppText variant="base" weight="semibold" numberOfLines={1}>
          {title}
        </AppText>
        {tx.note?.trim() ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {tx.note.trim()}
          </AppText>
        ) : null}
      </View>
      <View style={[cell(COLUMNS[2]), { flexDirection: "row", alignItems: "center", gap: tokens.space[2], paddingRight: tokens.space[3] }]}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: categoryColor ?? tokens.colors.muted }} />
        <AppText variant="sm" numberOfLines={1} style={{ flex: 1 }}>
          {category}
        </AppText>
      </View>
      <View style={cell(COLUMNS[3])}>
        <AppText variant="sm" tone="muted" numberOfLines={1}>
          {paymentMethodLabel(tx.paymentMethod)}
        </AppText>
      </View>
      <View style={[cell(COLUMNS[4]), { alignItems: "flex-end" }]}>
        <MoneyAmount value={money} kind={tx.type} size="base" weight="bold" />
      </View>
    </HapticPressable>
  );
}
