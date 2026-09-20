/**
 * Phase 1 end-to-end reconciliation, through the real API client + query layer against the mock
 * backend: 288 live rows over 18 months, soft-deleted rows, and another user's book with the same
 * shape. Every expected figure is computed here by plain array code (see `expected()`), never by
 * the mock's own filter/analyze engine.
 *
 * Not covered here (needs a real server): XLSX bytes and real import parsing - see PHASE1_ACCEPTANCE.md.
 */
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";

import * as api from "@/shared/api/transactions";
import { queryClient } from "@/shared/api/queryClient";
import { mockBackend } from "@/shared/api/mockAdapter";
import { MOCK_EXPORT_HEADER } from "@/shared/api/mockQuery";
import { useAuthStore } from "@/features/auth/store";
import { useBooksStore } from "@/features/books/store";
import type { TransactionResponse } from "@/shared/types/api";
import { addDaysYmd, addMonthsYmd, endOfMonthYmd, startOfMonthYmd, type Ymd } from "@/shared/utils/ledgerDate";
import {
  addChild,
  buildQuery,
  drillRoot,
  emptyRoot,
  makeCondition,
  makeGroup,
  setQuickAmount,
  setQuickDate,
  setQuickPayment,
  type BuiltQuery,
  type FilterRoot,
} from "../filterModel";
import {
  fetchAnalysis,
  fetchSearchPage,
  invalidateTransactionData,
  useAnalysis,
  useSearchInfinite,
  type AccountScope,
} from "../queries";
import { deleteTransaction, duplicateTransaction, updateTransaction } from "../actions";
import { mapTransactionResponse } from "../model";
import { buildFixture, installFixture, restoreBackend, type Fixture } from "./fixtures/phase1Fixture";

const TODAY: Ymd = new Date().toISOString().slice(0, 10); // fixture book is UTC, so this is its ledger "today"
const fx: Fixture = buildFixture(TODAY);
const scope: AccountScope = { accountId: "user-A", bookId: fx.book.id };

const AMOUNT = { min: 2000, max: 9000 };
// Starts mid-month, so the first bucket is a partial period; ends with this month so a duplicate (dated today) matches.
const RANGE = { startDate: addDaysYmd(startOfMonthYmd(addMonthsYmd(TODAY, -15)), 9), endDate: endOfMonthYmd(TODAY) };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

/** (Food OR Transport) AND CARD AND amount range AND date range - built through the app's own filter model. */
function parentRoot(): FilterRoot {
  const base = emptyRoot();
  let root = addChild(
    base,
    base.id,
    makeGroup("OR", [makeCondition("categoryId", "EQ", fx.cat.Food.id), makeCondition("categoryId", "EQ", fx.cat.Transport.id)])
  );
  root = setQuickPayment(root, ["CARD"], false);
  root = setQuickAmount(root, AMOUNT.min, AMOUNT.max);
  return setQuickDate(root, RANGE);
}

// ------------------------------------------------------------------ independent oracle

type Row = TransactionResponse;
const live = () => mockBackend.state.transactions.filter((t) => t.bookId === fx.book.id && !t.deletedAt);

/** The same predicate as `parentRoot()`, written as plain code. `over` swaps the date range / adds restrictions. */
function expected(over: { start?: Ymd; end?: Ymd; categoryId?: string; type?: "EXPENSE" | "INCOME" } = {}, rows: Row[] = live()): Row[] {
  const start = over.start ?? RANGE.startDate;
  const end = over.end ?? RANGE.endDate;
  return rows.filter(
    (t) =>
      (t.categoryId === fx.cat.Food.id || t.categoryId === fx.cat.Transport.id) &&
      t.paymentMethod === "CARD" &&
      t.amountMinor >= AMOUNT.min &&
      t.amountMinor <= AMOUNT.max &&
      t.occurredOn >= start &&
      t.occurredOn <= end &&
      (!over.categoryId || t.categoryId === over.categoryId) &&
      (!over.type || t.type === over.type)
  );
}
const sum = (rows: Row[]) => rows.reduce((s, t) => s + t.amountMinor, 0);
const byDefaultOrder = (a: Row, b: Row) =>
  a.occurredOn < b.occurredOn ? 1 : a.occurredOn > b.occurredOn ? -1 : a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id < b.id ? 1 : -1;

async function allPages(q: Pick<BuiltQuery, "filter" | "sort">) {
  const items: Row[] = [];
  let offset = 0;
  let totalCount = -1;
  for (;;) {
    const page = await fetchSearchPage(scope, q, offset);
    totalCount = page.totalCount;
    items.push(...page.items);
    if (!page.page.hasMore) break;
    offset += page.items.length;
  }
  return { items, totalCount };
}

beforeEach(() => {
  installFixture(fx);
  useAuthStore.setState({ user: { id: "user-A", email: "a@x.io", defaultCurrencyCode: "USD", createdAt: "" } });
  useBooksStore.setState({ selectedBookId: fx.book.id, books: [fx.book as never] });
});

afterEach(async () => {
  await queryClient.cancelQueries();
  queryClient.clear();
});

afterAll(() => restoreBackend());

// ------------------------------------------------------------------ fixture sanity

describe("fixture", () => {
  it("has >250 live rows over 18 months, soft-deleted rows, and a second book of the same shape", () => {
    expect(live().length).toBeGreaterThan(250);
    expect(new Set(live().map((t) => t.occurredOn.slice(0, 7))).size).toBe(18);
    expect(fx.rows.some((t) => t.deletedAt)).toBe(true);
    expect(fx.otherRows.length).toBeGreaterThan(250);
    expect(expected().length).toBeGreaterThanOrEqual(10);
    // Equal amounts exist (they exercise the id tie-breaker).
    const amounts = live().map((t) => t.amountMinor);
    expect(new Set(amounts).size).toBeLessThan(amounts.length);
  });
});

// ------------------------------------------------------------------ aggregates + pages

describe("(Food OR Transport) AND CARD AND amount range AND date range", () => {
  const q = () => buildQuery(parentRoot(), [], TODAY);

  it("aggregate totals, categories and buckets equal the independent calculation", async () => {
    const exp = expected();
    const a = await fetchAnalysis(scope, q(), "MONTH");

    expect(a.bookId).toBe(fx.book.id);
    expect(a.matchedCount).toBe(exp.length);
    expect(a.expenseTotalMinor).toBe(sum(exp.filter((t) => t.type === "EXPENSE")));
    expect(a.incomeTotalMinor).toBe(sum(exp.filter((t) => t.type === "INCOME")));
    expect(a.netMinor).toBe(a.incomeTotalMinor - a.expenseTotalMinor);

    for (const cat of [fx.cat.Food, fx.cat.Transport]) {
      const rows = exp.filter((t) => t.categoryId === cat.id);
      const got = a.categories.find((c) => c.categoryId === cat.id)!;
      expect(got.totalMinor).toBe(sum(rows));
      expect(got.count).toBe(rows.length);
      expect(got.percentOfExpense).toBeCloseTo((sum(rows) / a.expenseTotalMinor) * 100, 1);
    }
    expect(a.categories.map((c) => c.categoryId).sort()).toEqual([fx.cat.Food.id, fx.cat.Transport.id].sort());

    // Every month of the window is present (zeros included), the first is partial, and each bucket matches.
    expect(a.buckets[0].partial).toBe(true);
    expect(a.buckets.some((b) => b.expenseTotalMinor === 0 && b.count === 0) || a.buckets.length > 10).toBe(true);
    for (const b of a.buckets) {
      const rows = exp.filter((t) => t.occurredOn.slice(0, 7) === b.key);
      expect(b.expenseTotalMinor).toBe(sum(rows));
      expect(b.count).toBe(rows.length);
    }
    for (const cell of a.categoryBuckets) {
      const rows = exp.filter((t) => t.categoryId === cell.categoryId && t.occurredOn.slice(0, 7) === cell.bucketKey);
      expect(cell.totalMinor).toBe(sum(rows));
      expect(cell.count).toBe(rows.length);
    }

    // Monthly buckets add up to the yearly buckets and to the grand total for the same window.
    const yearly = await fetchAnalysis(scope, q(), "YEAR");
    expect(yearly.expenseTotalMinor).toBe(a.expenseTotalMinor);
    for (const y of yearly.buckets) {
      expect(y.expenseTotalMinor).toBe(a.buckets.filter((b) => b.key.startsWith(y.key)).reduce((s, b) => s + b.expenseTotalMinor, 0));
    }
    expect(a.buckets.reduce((s, b) => s + b.expenseTotalMinor, 0)).toBe(a.expenseTotalMinor);

    // Nothing from the other user's book, nothing soft-deleted.
    expect(a.matchedCount).toBe(expected(undefined, fx.rows.filter((r) => r.bookId === fx.book.id && !r.deletedAt)).length);
  });

  it("all pages reconcile with the aggregate: same count, same sum, unique ids, only this book, server order", async () => {
    const exp = expected();
    const a = await fetchAnalysis(scope, q(), "MONTH");
    const { items, totalCount } = await allPages(q());

    expect(totalCount).toBe(exp.length);
    expect(items).toHaveLength(a.matchedCount);
    expect(new Set(items.map((t) => t.id)).size).toBe(items.length);
    expect(items.map((t) => t.id)).toEqual([...exp].sort(byDefaultOrder).map((t) => t.id));
    expect(sum(items)).toBe(a.expenseTotalMinor + a.incomeTotalMinor);
    expect(items.every((t) => t.bookId === fx.book.id && !t.deletedAt)).toBe(true);
  });

  it("the OR group is never edited by a drill-down; the restriction is a sibling under the top-level AND", () => {
    const parent = parentRoot();
    const orBefore = JSON.stringify(parent.children.find((c) => c.kind === "group"));
    const drilled = drillRoot(parent, { window: { startDate: "2025-01-01", endDate: "2025-01-31" }, categoryId: fx.cat.Food.id, type: "EXPENSE" })!;

    expect(drilled.op).toBe("AND");
    expect(JSON.stringify(drilled.children.find((c) => c.kind === "group"))).toBe(orBefore);
    expect(drilled.children.some((c) => c.kind === "condition" && c.field === "categoryId" && c.operator === "EQ" && c.value === fx.cat.Food.id)).toBe(true);
    expect(drilled.children.some((c) => c.kind === "condition" && c.field === "type" && c.value === "EXPENSE")).toBe(true);

    // An OR root is wrapped, not extended: the category can never end up as another OR branch.
    const orRoot = makeGroup("OR", [makeCondition("paymentMethod", "EQ", "CARD"), makeCondition("paymentMethod", "EQ", "CASH")]);
    const wrapped = drillRoot(orRoot, { window: { startDate: "2025-01-01", endDate: "2025-01-31" }, categoryId: fx.cat.Food.id })!;
    expect(wrapped.op).toBe("AND");
    expect(wrapped.children.some((c) => c.kind === "group" && c.op === "OR")).toBe(true);
  });

  it("drill-down (category, category x bucket, all-spending) returns exactly the rows the figure counted", async () => {
    const parent = parentRoot();
    const a = await fetchAnalysis(scope, q(), "MONTH");

    // Category over the whole analysis window.
    for (const cat of [fx.cat.Food, fx.cat.Transport]) {
      const total = a.categories.find((c) => c.categoryId === cat.id)!;
      const drilled = buildQuery(drillRoot(parent, { window: a.window, categoryId: cat.id, type: "EXPENSE" })!, [], TODAY);
      const { items, totalCount } = await allPages(drilled);
      expect(totalCount).toBe(total.count);
      expect(items).toHaveLength(total.count);
      expect(sum(items)).toBe(total.totalMinor);
      expect(items.map((t) => t.id).sort()).toEqual(expected({ categoryId: cat.id, type: "EXPENSE" }).map((t) => t.id).sort());
    }

    // Category x bucket (including the partial first bucket, whose bounds are clipped to the window).
    for (const bucket of a.buckets) {
      const cell = a.categoryBuckets.find((c) => c.categoryId === fx.cat.Food.id && c.bucketKey === bucket.key)!;
      const drilled = buildQuery(drillRoot(parent, { window: { startDate: bucket.start, endDate: bucket.end }, categoryId: fx.cat.Food.id, type: "EXPENSE" })!, [], TODAY);
      const { items } = await allPages(drilled);
      expect(items).toHaveLength(cell.count);
      expect(sum(items)).toBe(cell.totalMinor);
      expect(items.map((t) => t.id).sort()).toEqual(
        expected({ start: bucket.start, end: bucket.end, categoryId: fx.cat.Food.id, type: "EXPENSE" }).map((t) => t.id).sort()
      );
    }

    // "All spending" for a bucket: the bucket's expense total.
    const b = a.buckets.find((x) => x.expenseTotalMinor > 0)!;
    const drilled = buildQuery(drillRoot(parent, { window: { startDate: b.start, endDate: b.end }, type: "EXPENSE" })!, [], TODAY);
    const { items } = await allPages(drilled);
    expect(sum(items)).toBe(b.expenseTotalMinor);
    expect(items).toHaveLength(b.count);
  });

  it("export of the current results has exactly the search's row ids, order and totals", async () => {
    const exp = expected();
    const a = await fetchAnalysis(scope, q(), "MONTH");

    const read = async (sort: BuiltQuery["sort"]) => {
      const bytes = await api.exportQuery(fx.book.id, { filter: q().filter, ...(sort.length ? { sort } : {}) });
      const [header, ...lines] = new TextDecoder().decode(bytes).split("\n");
      expect(header).toBe(MOCK_EXPORT_HEADER);
      return lines.map((l) => l.split(","));
    };

    const rows = await read([]);
    expect(rows.map((r) => r[0])).toEqual([...exp].sort(byDefaultOrder).map((t) => t.id));
    expect(rows.reduce((s, r) => s + Number(r[2]), 0)).toBe(a.expenseTotalMinor + a.incomeTotalMinor);
    expect(rows.every((r) => r[0].startsWith("A-"))).toBe(true); // never the other user's book

    // A non-default sort: ties on the (many) equal amounts are broken by id, ascending.
    const sorted = await read([{ field: "amountMinor", direction: "DESC" }]);
    expect(sorted.map((r) => r[0])).toEqual([...exp].sort((x, y) => y.amountMinor - x.amountMinor || (x.id < y.id ? -1 : 1)).map((t) => t.id));
    const search = await allPages({ filter: q().filter, sort: [{ field: "amountMinor", direction: "DESC" }] });
    expect(sorted.map((r) => r[0])).toEqual(search.items.map((t) => t.id));
  });
});

// ------------------------------------------------------------------ mutations refresh the charts

describe("writes refresh the visible rows and charts", () => {
  const q = () => buildQuery(parentRoot(), [], TODAY);

  function mount() {
    return renderHook(
      () => ({ search: useSearchInfinite(q()), analysis: useAnalysis(q(), "MONTH") }),
      { wrapper }
    );
  }
  const ready = async (result: ReturnType<typeof mount>["result"]) => {
    await waitFor(() => expect(result.current.analysis.data).toBeDefined());
    await waitFor(() => expect(result.current.search.data).toBeDefined());
  };
  const monthTotal = (result: ReturnType<typeof mount>["result"], key: string) =>
    result.current.analysis.data!.buckets.find((b) => b.key === key)!.expenseTotalMinor;
  const first = (pred: (t: Row) => boolean) => mapTransactionResponse(expected().find(pred)!);

  it("category / amount / date edits move totals; a row that stops matching leaves; createdAt never changes", async () => {
    const { result } = mount();
    await ready(result);
    const total0 = result.current.analysis.data!.expenseTotalMinor;
    const count0 = result.current.analysis.data!.matchedCount;

    // 1. Amount edit that stays inside the range: still listed, totals shift by the delta.
    const a = first((t) => t.amountMinor < 8000);
    const delta = 8500 - a.amountMinor;
    const before = await api.getTransaction(fx.book.id, a.id);
    const editedA = (await updateTransaction(a, { amountMinor: 8500 }))!;
    await waitFor(() => expect(result.current.analysis.data!.expenseTotalMinor).toBe(total0 + delta));
    expect(result.current.analysis.data!.matchedCount).toBe(count0);
    expect(editedA.createdAt).toBe(before.createdAt);
    expect(editedA.version).toBe(before.version + 1);
    expect(expected().length).toBe(count0);
    expect(result.current.analysis.data!.expenseTotalMinor).toBe(sum(expected()));

    // 2. Date edit into another month of the window: one bucket loses the row, the other gains it.
    const b = first((t) => t.id !== a.id && t.occurredOn.slice(0, 7) !== TODAY.slice(0, 7));
    const oldKey = b.occurredOn.slice(0, 7);
    const newKey = TODAY.slice(0, 7);
    const oldTotal = monthTotal(result, oldKey);
    const newTotal = monthTotal(result, newKey);
    const editedB = (await updateTransaction(b, { occurredOn: TODAY, occurredAt: `${TODAY}T12:00:00.000Z` }, b.occurredOn))!;
    await waitFor(() => expect(monthTotal(result, oldKey)).toBe(oldTotal - b.amountMinor));
    expect(monthTotal(result, newKey)).toBe(newTotal + b.amountMinor);
    expect(editedB.createdAt).toBe(b.createdAt);
    expect(result.current.analysis.data!.matchedCount).toBe(count0);

    // 3. Category edit out of the (Food OR Transport) set: the row disappears from rows AND totals.
    const c = first((t) => t.id !== a.id && t.id !== b.id);
    const totalBeforeC = result.current.analysis.data!.expenseTotalMinor;
    const editedC = (await updateTransaction(c, { categoryId: fx.cat.Rent.id }, c.occurredOn))!;
    await waitFor(() => expect(result.current.analysis.data!.matchedCount).toBe(count0 - 1));
    expect(result.current.analysis.data!.expenseTotalMinor).toBe(totalBeforeC - c.amountMinor);
    expect(editedC.createdAt).toBe(c.createdAt);
    await waitFor(() => expect(result.current.search.data!.pages[0].totalCount).toBe(count0 - 1));
    expect(result.current.search.data!.pages[0].items.some((t) => t.id === c.id)).toBe(false);

    // 4. Amount edit out of the range removes it too.
    const d = first((t) => ![a.id, b.id, c.id].includes(t.id));
    await updateTransaction(d, { amountMinor: AMOUNT.max + 1 }, d.occurredOn);
    await waitFor(() => expect(result.current.analysis.data!.matchedCount).toBe(count0 - 2));
    expect(result.current.analysis.data!.expenseTotalMinor).toBe(sum(expected()));

    // The refreshed figures still equal the independent calculation, and the stored creation times are intact.
    for (const t of [a, b, c, d]) {
      expect(mockBackend.state.transactions.find((x) => x.id === t.id)!.createdAt).toBe(t.createdAt);
    }
  });

  it("delete, duplicate and import refresh results and totals", async () => {
    const { result } = mount();
    await ready(result);
    const count0 = result.current.analysis.data!.matchedCount;

    // Delete
    const gone = first(() => true);
    await deleteTransaction(gone);
    await waitFor(() => expect(result.current.analysis.data!.matchedCount).toBe(count0 - 1));
    expect(result.current.analysis.data!.expenseTotalMinor).toBe(sum(expected()));

    // Duplicate: a real create (fresh id, later createdAt); dated today, which is inside the window.
    const original = first((t) => t.id !== gone.id);
    const copy = (await duplicateTransaction(original))!;
    expect(copy.id).not.toBe(original.id);
    expect(copy.createdAt >= original.createdAt).toBe(true);
    await waitFor(() => expect(result.current.analysis.data!.matchedCount).toBe(count0));
    expect(result.current.analysis.data!.expenseTotalMinor).toBe(sum(expected()));
    await waitFor(() => expect(result.current.search.data!.pages[0].items.some((t) => t.id === copy.id)).toBe(true));

    // Import: the mock has no XLSX parser, so the rows land server-side directly and the import
    // modal's own follow-up (`invalidateTransactionData`) is what is under test.
    const template = expected()[0];
    for (let i = 0; i < 3; i++) {
      mockBackend.state.transactions.push({ ...template, id: `imported-${i}`, externalId: `ext-${i}`, title: `Imported ${i}` });
    }
    await invalidateTransactionData(queryClient, fx.book.id);
    await waitFor(() => expect(result.current.analysis.data!.matchedCount).toBe(count0 + 3));
    expect(result.current.analysis.data!.expenseTotalMinor).toBe(sum(expected()));
    await waitFor(() => expect(result.current.search.data!.pages[0].totalCount).toBe(count0 + 3));
  });
});
