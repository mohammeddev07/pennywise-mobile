import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { FlatList } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import AnalyticsScreen from "@/app/(tabs)/analytics";
import TransactionsScreen from "@/app/(tabs)/transactions";
import { queryClient } from "@/shared/api/queryClient";
import { barHeightFor } from "@/shared/ui/components/TrendChart";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { useAuthStore } from "@/features/auth/store";
import { useBooksStore } from "@/features/books/store";
import { useCategoriesStore } from "@/features/categories/store";
import { mockBackend } from "@/shared/api/mockAdapter";
import { buildQuery, canonicalKey, emptyRoot, setQuickDate, setQuickDescription, setQuickPayment, toWire } from "../filterModel";
import { fetchAnalysis } from "../queries";
import { useFilterStore, makeScope } from "../filterStore";
import { setActivityScroll } from "../activityScroll";
import { insightsWindow, series } from "../insights";
import { buildFixture, installFixture, restoreBackend } from "./fixtures/phase1Fixture";

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: jest.fn(() => null),
  DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
}));
jest.mock("expo-file-system/legacy", () => ({}));

const TODAY = new Date().toISOString().slice(0, 10);
const fx = buildFixture(TODAY);
const scope = makeScope("user-A", fx.book.id);
const WIN = insightsWindow("MONTH", TODAY);

const inWindow = () => mockBackend.state.transactions.filter((t) => t.bookId === fx.book.id && !t.deletedAt && t.occurredOn >= WIN.startDate && t.occurredOn <= WIN.endDate);
const sum = (rows: Array<{ amountMinor: number }>) => rows.reduce((s, t) => s + t.amountMinor, 0);
const usd = (minor: number) => formatCurrency(minor, "USD");

const wrap = (node: React.ReactNode) => <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>;

beforeEach(() => {
  installFixture(fx);
  useAuthStore.setState({ user: { id: "user-A", email: "a@x.io", defaultCurrencyCode: "USD", createdAt: "" } });
  useBooksStore.setState({ selectedBookId: fx.book.id, books: [fx.book as never] });
  useCategoriesStore.setState({ categories: mockBackend.state.categories as never });
  useFilterStore.getState().clearAllScopes();
});

afterEach(async () => {
  await queryClient.cancelQueries();
  queryClient.clear();
});
afterAll(() => restoreBackend());

describe("TrendChart bars", () => {
  it("draw zero as no bar, any positive value as a visible one, on a shared zero baseline", () => {
    expect(barHeightFor(0, 1000, 136)).toBe(0);
    expect(barHeightFor(1, 1_000_000, 136)).toBeGreaterThanOrEqual(2);
    expect(barHeightFor(1000, 1000, 136)).toBe(136);
    expect(barHeightFor(500, 1000, 136)).toBe(68); // proportional, from zero
  });
});

describe("series()", () => {
  it("keeps INCOME and EXPENSE apart and reports real zeros for empty periods", async () => {
    const q = buildQuery(setQuickDate(emptyRoot(), WIN), [], TODAY);
    const a = await fetchAnalysis({ accountId: "user-A", bookId: fx.book.id }, q, "MONTH");
    const spend = series(a, "EXPENSE", null);
    const income = series(a, "INCOME", null);
    expect(spend.reduce((s, p) => s + p.valueMinor, 0)).toBe(a.expenseTotalMinor);
    expect(income.reduce((s, p) => s + p.valueMinor, 0)).toBe(a.incomeTotalMinor);
    expect(a.expenseTotalMinor).toBe(sum(inWindow().filter((t) => t.type === "EXPENSE")));
    expect(spend).toHaveLength(12);
    const food = series(a, "EXPENSE", fx.cat.Food.id);
    expect(food.reduce((s, p) => s + p.valueMinor, 0)).toBe(sum(inWindow().filter((t) => t.categoryId === fx.cat.Food.id)));
  });
});

describe("Insights screen", () => {
  it("totals and every category come from one analysis and equal the fixture; the list is biggest-first", async () => {
    render(wrap(<AnalyticsScreen />));
    const exp = inWindow().filter((t) => t.type === "EXPENSE");
    await waitFor(() => expect(screen.getAllByText(usd(sum(exp))).length).toBeGreaterThan(0));

    const names = ["Food", "Transport", "Shopping", "Rent"];
    const expectedOrder = names
      .map((n) => ({ n, total: sum(exp.filter((t) => t.categoryId === fx.cat[n as "Food"].id)) }))
      .sort((a, b) => b.total - a.total)
      .map((c) => c.n);
    const labels = screen.getAllByRole("button").map((b) => String(b.props.accessibilityLabel ?? ""));
    const listed = labels.filter((l) => names.some((n) => l.startsWith(`${n},`)));
    expect(listed.map((l) => l.split(",")[0])).toEqual(expectedOrder);
    // amount + count on each row
    const food = exp.filter((t) => t.categoryId === fx.cat.Food.id);
    expect(listed.find((l) => l.startsWith("Food,"))).toContain(`${usd(sum(food))}`);
    expect(listed.find((l) => l.startsWith("Food,"))).toContain(`${food.length} transactions`);
    // Chart states its baseline and currency.
    expect(screen.getByText(/Bars start at 0 · USD/)).toBeTruthy();
  });

  it("income is separate from spending", async () => {
    render(wrap(<AnalyticsScreen />));
    await waitFor(() => expect(screen.getByText("Where it went")).toBeTruthy());
    fireEvent.press(screen.getAllByText("Income")[0]); // the segment; the stat block comes after it
    await waitFor(() => expect(screen.getByText("Where it came from")).toBeTruthy());
    const salary = inWindow().filter((t) => t.type === "INCOME");
    expect(screen.getAllByRole("button").some((b) => String(b.props.accessibilityLabel).startsWith(`Salary, ${usd(sum(salary))}`))).toBe(true);
    expect(screen.queryByText(/of filtered spending/)).toBeNull(); // no expense share on income
  });

  it("explains an empty result instead of drawing anything", async () => {
    render(wrap(<AnalyticsScreen />));
    await waitFor(() => expect(screen.getByText("Where it went")).toBeTruthy());
    act(() => useFilterStore.getState().applyRoot(scope, setQuickDescription(useFilterStore.getState().byScope[scope].root, "no such thing")));
    await waitFor(() => expect(screen.getByText("No matching transactions")).toBeTruthy());
    expect(screen.queryByText("Where it went")).toBeNull();
  });

  it("selecting a category + View opens Activity with AND(parent, category, EXPENSE); Back restores filter and scroll", async () => {
    const insights = render(wrap(<AnalyticsScreen />));
    await waitFor(() => expect(screen.getByText("Where it went")).toBeTruthy());

    // A parent predicate Insights must carry over (and never lose when switching tabs).
    act(() => useFilterStore.getState().applyRoot(scope, setQuickPayment(setQuickDate(useFilterStore.getState().byScope[scope].root, null), ["CARD"], false)));
    const before = useFilterStore.getState().byScope[scope].root;
    const beforeKey = canonicalKey(toWire(before));
    setActivityScroll(scope, 240);

    const cardFood = inWindow().filter((t) => t.categoryId === fx.cat.Food.id && t.paymentMethod === "CARD");
    await waitFor(() =>
      expect(screen.getAllByRole("button").some((b) => String(b.props.accessibilityLabel).startsWith(`Food, ${usd(sum(cardFood))}`))).toBe(true)
    );
    fireEvent.press(screen.getAllByRole("button").find((b) => String(b.props.accessibilityLabel).startsWith("Food,"))!);
    fireEvent.press(screen.getByText(`View ${cardFood.length} in Activity`));

    const applied = useFilterStore.getState().byScope[scope].root;
    const flat = JSON.stringify(toWire(applied));
    expect(applied.op).toBe("AND");
    expect(flat).toContain(fx.cat.Food.id);
    expect(flat).toContain('"CARD"');
    expect(flat).toContain('"EXPENSE"');
    expect(flat).toContain(WIN.startDate);
    expect(useFilterStore.getState().drills[scope]?.scrollOffset).toBe(240);
    insights.unmount();

    // Activity shows exactly the rows behind the figure, with a way back.
    const scrollTo = jest.spyOn(FlatList.prototype, "scrollToOffset").mockImplementation(() => {});
    render(wrap(<TransactionsScreen />));
    await waitFor(() => expect(screen.getByText(new RegExp(`· ${cardFood.length} transactions?$`))).toBeTruthy());
    expect(screen.getByText("Back to previous filter")).toBeTruthy();
    fireEvent.press(screen.getByText("Back to previous filter"));

    const restored = useFilterStore.getState().byScope[scope].root;
    expect(canonicalKey(toWire(restored))).toBe(beforeKey);
    expect(useFilterStore.getState().drills[scope]).toBeUndefined();
    await waitFor(() => expect(screen.queryByText("Back to previous filter")).toBeNull());
    // The list goes back to where it was, once the restored rows are on screen, and the request is consumed.
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith({ offset: 240, animated: false }));
    expect(useFilterStore.getState().pendingScroll[scope]).toBeUndefined();
    scrollTo.mockRestore();
  });
});
