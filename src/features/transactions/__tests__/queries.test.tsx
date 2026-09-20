import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import * as api from "@/shared/api/transactions";
import { queryClient } from "@/shared/api/queryClient";
import { mockBackend } from "@/shared/api/mockAdapter";
import { bumpAccountEpoch } from "@/shared/session/accountEpoch";
import { useAuthStore } from "@/features/auth/store";
import { useBooksStore } from "@/features/books/store";
import { buildQuery, emptyRoot, makeCondition, addChild, setQuickDate, setQuickType, type BuiltQuery } from "../filterModel";
import {
  StaleAccountError,
  StaleBookError,
  fetchSearchPage,
  txKeys,
  useActivityResults,
  useSearchInfinite,
  useTransactionDetail,
} from "../queries";
import { createTransaction, deleteTransaction, duplicateTransaction, updateTransaction } from "../actions";
import { isNotFoundError, isStaleVersionError, mapTransactionResponse } from "../model";

const book = mockBackend.state.books[0];
const bookId = book.id;
const expenseCategory = mockBackend.state.categories.find((c) => c.type === "EXPENSE")!;
const WINDOW = { startDate: "2022-01-01", endDate: "2026-12-31" };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

function query(type: "EXPENSE" | "INCOME" | null = null, extra?: (r: ReturnType<typeof emptyRoot>) => ReturnType<typeof emptyRoot>): BuiltQuery {
  let root = setQuickDate(emptyRoot(), WINDOW);
  if (type) root = setQuickType(root, type);
  if (extra) root = extra(root);
  return buildQuery(root, [], "2026-03-15");
}

const setAccount = (id: string) =>
  useAuthStore.setState({ user: { id, email: `${id}@x.io`, defaultCurrencyCode: "USD", createdAt: "" } });

const seededRows = () => mockBackend.state.transactions.filter((t) => !t.id.startsWith("bulk_"));

beforeEach(() => {
  setAccount("user-A");
  useBooksStore.setState({ selectedBookId: bookId, books: [{ ...book } as never] });
  mockBackend.seedTransactions(bookId, 230, "2026-03-15");
});

afterEach(async () => {
  jest.restoreAllMocks();
  await queryClient.cancelQueries();
  queryClient.clear();
  mockBackend.state.transactions = seededRows().map((t) => ({ ...t, deletedAt: null }));
});

const matching = (type: "EXPENSE" | "INCOME" | null) =>
  mockBackend.state.transactions.filter(
    (t) => !t.deletedAt && t.bookId === bookId && t.occurredOn >= WINDOW.startDate && t.occurredOn <= WINDOW.endDate && (!type || t.type === type)
  );

describe("more than 100 rows", () => {
  it("pages the full ledger from the server; totals cover every match, not the loaded rows", async () => {
    const q = query("EXPENSE");
    const expected = matching("EXPENSE");
    expect(expected.length).toBeGreaterThan(200);

    const { result } = renderHook(() => useActivityResults(q), { wrapper });
    await waitFor(() => expect(result.current.rows.length).toBe(50));

    // 50 rows are loaded, but the total and the sum already describe all of them.
    await waitFor(() => expect(result.current.totals).not.toBeNull());
    expect(result.current.totalCount).toBe(expected.length);
    expect(result.current.totals!.matchedCount).toBe(expected.length);
    expect(result.current.totals!.expenseTotalMinor).toBe(expected.reduce((s, t) => s + t.amountMinor, 0));
    const loadedSum = result.current.rows.reduce((s, t) => s + t.amountMinor, 0);
    expect(result.current.totals!.expenseTotalMinor).toBeGreaterThan(loadedSum);
    expect(result.current.hasNextPage).toBe(true);

    while (result.current.hasNextPage) {
      const before = result.current.rows.length;
      await act(async () => {
        await result.current.fetchNextPage();
      });
      await waitFor(() => expect(result.current.rows.length).toBeGreaterThan(before));
    }
    expect(result.current.rows).toHaveLength(expected.length);
    expect(new Set(result.current.rows.map((r) => r.id)).size).toBe(expected.length);
    // Server order preserved (default sort: newest date first).
    const days = result.current.rows.map((r) => r.occurredOn);
    expect([...days].sort().reverse()).toEqual(days);
  });
});

describe("stale responses", () => {
  type Call = { body: any; signal?: AbortSignal; resolve: (v: any) => void };

  function deferSearch() {
    const calls: Call[] = [];
    jest.spyOn(api, "searchTransactions").mockImplementation(
      (_book, body, signal) =>
        new Promise((resolve, reject) => {
          calls.push({ body, signal, resolve });
          signal?.addEventListener("abort", () => reject(Object.assign(new Error("canceled"), { code: "ERR_CANCELED" })));
        })
    );
    return calls;
  }

  const page = (ids: string[], total = ids.length) => ({
    items: ids.map((id) => ({ ...mockBackend.state.transactions[0], id, bookId })),
    totalCount: total,
    page: { offset: 0, limit: 50, hasMore: false },
    queryFingerprint: ids.join(),
  });

  it("an obsolete request is aborted and its late answer never appears", async () => {
    const calls = deferSearch();
    const a = query("EXPENSE");
    const b = query("INCOME");
    const { result, rerender } = renderHook(({ q }: { q: BuiltQuery }) => useSearchInfinite(q), {
      wrapper,
      initialProps: { q: a },
    });
    await waitFor(() => expect(calls).toHaveLength(1));

    rerender({ q: b });
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[0].signal?.aborted).toBe(true); // AbortSignal reaches the request

    await act(async () => {
      calls[1].resolve(page(["from-b"]));
    });
    await act(async () => {
      calls[0].resolve(page(["from-a"])); // late, already cancelled
    });
    await waitFor(() => expect(result.current.data?.pages[0].items.map((i) => i.id)).toEqual(["from-b"]));
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it("while a new filter loads, old rows are flagged as placeholder and totals are withheld", async () => {
    const calls = deferSearch();
    const analyzeCalls: Array<(v: any) => void> = [];
    jest.spyOn(api, "analyzeTransactions").mockImplementation(
      () =>
        new Promise((resolve) => {
          analyzeCalls.push(resolve);
        })
    );
    const totals = (n: number) => ({ bookId, matchedCount: n, incomeTotalMinor: 0, expenseTotalMinor: n * 100, netMinor: -n * 100 });

    const a = query("EXPENSE");
    const b = query("INCOME");
    const { result, rerender } = renderHook(({ q }: { q: BuiltQuery }) => useActivityResults(q), { wrapper, initialProps: { q: a } });
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => {
      calls[0].resolve(page(["a1", "a2"]));
      analyzeCalls[0](totals(2));
    });
    await waitFor(() => expect(result.current.totals?.matchedCount).toBe(2));
    expect(result.current.isUpdating).toBe(false);

    rerender({ q: b });
    await waitFor(() => expect(result.current.isUpdating).toBe(true));
    expect(result.current.rows.map((r) => r.id)).toEqual(["a1", "a2"]); // shown dimmed, not as the answer
    expect(result.current.rowsCurrent).toBe(false);
    expect(result.current.totals).toBeNull(); // the previous filter's totals are never shown as current

    await act(async () => {
      calls[1].resolve(page(["b1"]));
      analyzeCalls[1](totals(1));
    });
    await waitFor(() => expect(result.current.totals?.matchedCount).toBe(1));
    expect(result.current.rows.map((r) => r.id)).toEqual(["b1"]);
    expect(result.current.rowsCurrent).toBe(true);
    expect(result.current.isUpdating).toBe(false);
  });
});

describe("account and book switches", () => {
  it("cache keys carry the account and the book", () => {
    const h = "hash";
    expect(txKeys.search({ accountId: "A", bookId: "b" }, h)).not.toEqual(txKeys.search({ accountId: "B", bookId: "b" }, h));
    expect(txKeys.search({ accountId: "A", bookId: "b1" }, h)).not.toEqual(txKeys.search({ accountId: "A", bookId: "b2" }, h));
    expect(txKeys.analyze({ accountId: "A", bookId: "b" }, h, "YEAR")).not.toEqual(txKeys.search({ accountId: "A", bookId: "b" }, h));
    // Pagination is not part of an aggregate key.
    expect(JSON.stringify(txKeys.analyze({ accountId: "A", bookId: "b" }, h, "YEAR"))).not.toMatch(/offset|limit|page/);
  });

  it("a response that lands after the account changed is rejected", async () => {
    let release!: (v: any) => void;
    jest.spyOn(api, "searchTransactions").mockImplementation(() => new Promise((resolve) => (release = resolve)));
    const pending = fetchSearchPage({ accountId: "user-A", bookId }, query(), 0);
    bumpAccountEpoch(); // logout / login as someone else
    release({ items: [], totalCount: 0, page: { offset: 0, limit: 50, hasMore: false }, queryFingerprint: "x" });
    await expect(pending).rejects.toBeInstanceOf(StaleAccountError);
  });

  it("a response for another book is rejected", async () => {
    jest.spyOn(api, "searchTransactions").mockResolvedValue({
      items: [{ ...mockBackend.state.transactions[0], bookId: "some-other-book" }],
      totalCount: 1,
      page: { offset: 0, limit: 50, hasMore: false },
      queryFingerprint: "x",
    } as never);
    await expect(fetchSearchPage({ accountId: "user-A", bookId }, query(), 0)).rejects.toBeInstanceOf(StaleBookError);
  });

  it("switching account never shows the previous account's rows, even from a slow request", async () => {
    let releaseA!: (v: any) => void;
    let calls = 0;
    jest.spyOn(api, "searchTransactions").mockImplementation((_b, _body, signal) => {
      calls += 1;
      if (calls === 1) {
        return new Promise((resolve) => {
          releaseA = resolve;
          void signal;
        });
      }
      return Promise.resolve({ items: [], totalCount: 0, page: { offset: 0, limit: 50, hasMore: false }, queryFingerprint: "b" }) as never;
    });
    const q = query();
    const { result } = renderHook(() => useSearchInfinite(q), { wrapper });
    await waitFor(() => expect(calls).toBe(1));

    act(() => {
      bumpAccountEpoch();
      setAccount("user-B");
    });
    await waitFor(() => expect(result.current.data?.pages[0].totalCount).toBe(0));
    await act(async () => {
      releaseA({ items: [{ ...mockBackend.state.transactions[0], bookId }], totalCount: 1, page: { offset: 0, limit: 50, hasMore: false }, queryFingerprint: "a" });
    });
    expect(result.current.data?.pages[0].items).toHaveLength(0);
  });
});

describe("details are fetched by id", () => {
  it("resolves a transaction that is on no loaded page, and a deleted one is 404", async () => {
    const q = query("EXPENSE");
    const { result: list } = renderHook(() => useActivityResults(q), { wrapper });
    await waitFor(() => expect(list.current.rows.length).toBe(50));
    const loaded = new Set(list.current.rows.map((r) => r.id));
    const far = matching("EXPENSE").find((t) => !loaded.has(t.id))!;

    const { result } = renderHook(() => useTransactionDetail(far.id, bookId), { wrapper });
    await waitFor(() => expect(result.current.data?.id).toBe(far.id));
    expect(result.current.data?.amountMinor).toBe(far.amountMinor);
    expect(loaded.has(far.id)).toBe(false);

    await deleteTransaction(result.current.data!);
    const { result: gone } = renderHook(() => useTransactionDetail(far.id, bookId), { wrapper });
    await waitFor(() => expect(gone.current.isError).toBe(true));
    expect(isNotFoundError(gone.current.error)).toBe(true);
  });
});

describe("mutations refresh every dependent query", () => {
  it("create, edit-out-of-filter, duplicate and delete update rows and totals; pages reset", async () => {
    const q = query("EXPENSE");
    const { result } = renderHook(() => useActivityResults(q), { wrapper });
    await waitFor(() => expect(result.current.totals).not.toBeNull());
    const count0 = result.current.totals!.matchedCount;
    const sum0 = result.current.totals!.expenseTotalMinor;

    // Load a few pages, then mutate: the list must restart from offset 0.
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.rows.length).toBe(100));

    // Other cached data that a write makes stale.
    for (const key of [["balance", bookId], ["summary", bookId, "2026-09"], ["summaryRange", bookId, "a", "b"], ["budgets", bookId]]) {
      queryClient.setQueryData(key, { stale: true });
    }

    const created = (await createTransaction(bookId, "key-1", {
      type: "EXPENSE",
      amountMinor: 777,
      categoryId: expenseCategory.id,
      title: "Fresh row",
      occurredAt: "2026-03-10T12:00:00.000Z",
      occurredOn: "2026-03-10",
    }))!;
    await waitFor(() => expect(result.current.totals?.matchedCount).toBe(count0 + 1));
    expect(result.current.totals!.expenseTotalMinor).toBe(sum0 + 777);
    await waitFor(() => expect(result.current.rows.length).toBe(50)); // reset to the first page
    for (const key of [["balance", bookId], ["summary", bookId, "2026-09"], ["summaryRange", bookId, "a", "b"], ["budgets", bookId]]) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }

    // Edit it so it no longer matches (EXPENSE -> INCOME): it leaves the list and the totals.
    const incomeCategory = mockBackend.state.categories.find((c) => c.type === "INCOME")!;
    await updateTransaction(created, { type: "INCOME", categoryId: incomeCategory.id }, created.occurredOn);
    await waitFor(() => expect(result.current.totals?.matchedCount).toBe(count0));
    expect(result.current.totals!.expenseTotalMinor).toBe(sum0);

    // Duplicate (fresh key, new audit timestamps) then delete the copy.
    const original = mapTransactionResponse(mockBackend.state.transactions.find((t) => t.id === "bulk_00010")!);
    const copy = (await duplicateTransaction(original))!;
    expect(copy.id).not.toBe(original.id);
    expect(copy.createdAt >= original.createdAt).toBe(true);
    await waitFor(() => expect(result.current.totals?.matchedCount).toBe(count0 + 1));
    await deleteTransaction(copy);
    await waitFor(() => expect(result.current.totals?.matchedCount).toBe(count0));
  });
});

describe("edit with If-Match", () => {
  it("a stale version conflicts and changes nothing; the fresh version saves with createdAt untouched", async () => {
    const row = mapTransactionResponse(mockBackend.state.transactions.find((t) => t.id === "bulk_00020")!);

    // Someone else edits first.
    await updateTransaction(row, { title: "Edited elsewhere" });

    let error: unknown;
    try {
      await updateTransaction(row, { title: "My edit" }); // still holds the old version
    } catch (e) {
      error = e;
    }
    expect(isStaleVersionError(error)).toBe(true);
    const server = mockBackend.state.transactions.find((t) => t.id === "bulk_00020")!;
    expect(server.title).toBe("Edited elsewhere");

    const fresh = mapTransactionResponse(server);
    const saved = (await updateTransaction(fresh, { title: "My edit" }))!;
    expect(saved.title).toBe("My edit");
    expect(saved.version).toBe(fresh.version + 1);
    expect(saved.createdAt).toBe(row.createdAt); // creation time survives every edit
    expect(saved.updatedAt >= fresh.updatedAt).toBe(true);
    expect(saved.occurredAt).toBe(row.occurredAt);
  });

  it("audit fields are rejected by the server, never written", async () => {
    const row = mapTransactionResponse(mockBackend.state.transactions.find((t) => t.id === "bulk_00021")!);
    await expect(updateTransaction(row, { createdAt: "2001-01-01T00:00:00Z" } as never)).rejects.toMatchObject({
      response: { status: 400 },
    });
    expect(mockBackend.state.transactions.find((t) => t.id === "bulk_00021")!.createdAt).toBe(row.createdAt);
  });
});

afterAll(async () => {
  await queryClient.cancelQueries();
  queryClient.clear();
});
