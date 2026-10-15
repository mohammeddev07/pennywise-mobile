import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook } from "@testing-library/react-native";

import { useAuthStore } from "@/features/auth/store";
import { purgeBookData } from "@/features/books/coordinator";
import { bumpAccountEpoch, getAccountEpoch } from "@/shared/session/accountEpoch";
import type { Transaction } from "@/shared/types/models";
import type { AnalyzeResponse } from "@/shared/types/transactionQuery";
import { pickSnapshot, useHomeSnapshotStore } from "../store";
import type { HomeSnapshot, SnapshotContext } from "../types";
import { useSaveHomeSnapshot } from "../useHomeSnapshot";

const ctx: SnapshotContext = { accountId: "u1", bookId: "A", month: "2026-10", weekStart: "2026-10-09", weekEnd: "2026-10-15" };

const tx = (id: string): Transaction => ({
  id,
  bookId: "A",
  type: "EXPENSE",
  amountMinor: 500,
  title: "Coffee",
  categoryId: "c1",
  categoryName: "Food",
  note: "private note",
  paymentMethod: null,
  occurredAt: "2026-10-14T10:00:00Z",
  occurredOn: "2026-10-14",
  externalId: null,
  createdAt: "2026-10-14T10:00:00Z",
  updatedAt: "2026-10-14T10:00:00Z",
  version: 1,
});

const live = (balanceMinor = 123456) => ({
  balance: { bookId: "A", currencyCode: "USD", balanceMinor },
  summary: { bookId: "A", month: "2026-10", currencyCode: "USD", incomeTotalMinor: 1000, expenseTotalMinor: 500, byCategory: [] },
  weekAnalysis: { bookId: "A", buckets: [] } as unknown as AnalyzeResponse,
});

const payload = (c: SnapshotContext = ctx): Omit<HomeSnapshot, "savedAt"> => {
  const { note, ...row } = tx("t1");
  return { ...c, ...live(), recent: [row] };
};
const snap = (c: SnapshotContext): HomeSnapshot => ({ ...payload(c), savedAt: 1 });
const store = () => useHomeSnapshotStore.getState();

beforeEach(() => useHomeSnapshotStore.setState({ snapshot: null }));
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it("pickSnapshot matches only identical context", () => {
  expect(pickSnapshot(snap(ctx), ctx)).toBeDefined();
  for (const k of Object.keys(ctx)) expect(pickSnapshot(snap(ctx), { ...ctx, [k]: "other" })).toBeUndefined();
  expect(pickSnapshot(null, ctx)).toBeUndefined();
});

it("book A snapshot is never returned for book B", () => expect(pickSnapshot(snap(ctx), { ...ctx, bookId: "B" })).toBeUndefined());

it("save strips nothing it shouldn't and skips unchanged", () => {
  jest.spyOn(Date, "now").mockReturnValue(1000);
  store().save(payload(), getAccountEpoch());
  expect(store().snapshot).toEqual({ ...payload(), savedAt: 1000 });

  (Date.now as jest.Mock).mockReturnValue(5000);
  store().save(payload(), getAccountEpoch());
  expect(store().snapshot?.savedAt).toBe(1000);

  store().save({ ...payload(), balance: { ...payload().balance, balanceMinor: 1 } }, getAccountEpoch());
  expect(store().snapshot?.savedAt).toBe(5000);
  expect(store().snapshot?.balance.balanceMinor).toBe(1);
});

it("save from a stale epoch is dropped", () => {
  const e = getAccountEpoch();
  bumpAccountEpoch();
  store().save(payload(), e);
  expect(store().snapshot).toBeNull();
});

it("logout clears the snapshot and its storage key; next user never sees it", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  await useAuthStore.getState().login("a@test.com", "password");
  const accountId = useAuthStore.getState().user!.id;
  store().save(payload({ ...ctx, accountId }), getAccountEpoch());
  await act(async () => {});
  expect(await AsyncStorage.getItem("pennywise_home_snapshot_v1")).not.toBeNull();

  await useAuthStore.getState().logout();
  expect(store().snapshot).toBeNull();
  expect(await AsyncStorage.getItem("pennywise_home_snapshot_v1")).toBeNull();

  await useAuthStore.getState().login("b@test.com", "password");
  const newUser = useAuthStore.getState().user!;
  expect(pickSnapshot(store().snapshot, { ...ctx, accountId: newUser.id })).toBeUndefined();
});

it("purgeBookData drops that book's snapshot", async () => {
  store().save(payload(), getAccountEpoch());
  await purgeBookData("B");
  expect(store().snapshot).not.toBeNull();
  await purgeBookData("A");
  expect(store().snapshot).toBeNull();
});

it("recent rows are saved without note", () => {
  jest.useFakeTimers();
  renderHook(() => useSaveHomeSnapshot(ctx, { ...live(), recent: [tx("t1")] }));
  expect(store().snapshot).toBeNull();
  act(() => jest.advanceTimersByTime(2000));
  expect(store().snapshot?.recent[0].id).toBe("t1");
  expect((store().snapshot?.recent[0] as Transaction).note).toBeUndefined();
  expect(store().snapshot?.recent[0].title).toBe("Coffee");
});

it("weekAnalysis is saved without largestExpense (it carries a note)", () => {
  jest.useFakeTimers();
  const weekAnalysis = { ...live().weekAnalysis, largestExpense: tx("big") } as unknown as AnalyzeResponse;
  renderHook(() => useSaveHomeSnapshot(ctx, { ...live(), weekAnalysis, recent: [tx("t1")] }));
  act(() => jest.advanceTimersByTime(2000));
  expect(store().snapshot?.weekAnalysis.largestExpense).toBeNull();
  expect(JSON.stringify(store().snapshot)).not.toContain("private note");
});

it("does not save until every value is loaded", () => {
  jest.useFakeTimers();
  renderHook(() => useSaveHomeSnapshot(ctx, { ...live(), recent: undefined }));
  act(() => jest.advanceTimersByTime(5000));
  expect(store().snapshot).toBeNull();
});

it("debounce: two updates within 2 s → one save", () => {
  jest.useFakeTimers();
  let saves = 0;
  const unsub = useHomeSnapshotStore.subscribe((s, prev) => {
    if (s.snapshot !== prev.snapshot) saves++;
  });
  const recent = [tx("t1")];
  const { rerender } = renderHook((p: { balanceMinor: number }) => useSaveHomeSnapshot(ctx, { ...live(p.balanceMinor), recent }), {
    initialProps: { balanceMinor: 1 },
  });
  act(() => jest.advanceTimersByTime(1000));
  rerender({ balanceMinor: 2 });
  act(() => jest.advanceTimersByTime(1999));
  expect(saves).toBe(0);
  act(() => jest.advanceTimersByTime(1));
  unsub();
  expect(saves).toBe(1);
  expect(store().snapshot?.balance.balanceMinor).toBe(2);
});
