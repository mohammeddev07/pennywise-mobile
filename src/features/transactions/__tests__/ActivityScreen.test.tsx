import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import TransactionsScreen from "@/app/(tabs)/transactions";
import { queryClient } from "@/shared/api/queryClient";
import { mockBackend } from "@/shared/api/mockAdapter";
import { useAuthStore } from "@/features/auth/store";
import { useBooksStore } from "@/features/books/store";
import { useCategoriesStore } from "@/features/categories/store";
import { useFilterStore } from "../filterStore";
import { todayInTimeZone } from "@/shared/utils/ledgerDate";

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: jest.fn(() => null),
  DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
}));
jest.mock("expo-file-system/legacy", () => ({}));

// The jest window is 750dp wide, i.e. "medium"; tests pick the layout class they exercise.
let mockLayoutClass: "compact" | "medium" = "compact";
jest.mock("@/shared/ui/components/Screen", () => ({
  ...jest.requireActual("@/shared/ui/components/Screen"),
  useLayoutClass: () => mockLayoutClass,
}));

const book = mockBackend.state.books[0];

function renderScreen() {
  return render(
    <QueryClientProvider client={queryClient}>
      <TransactionsScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockLayoutClass = "compact";
  useAuthStore.setState({ user: { id: "user-A", email: "a@x.io", defaultCurrencyCode: "USD", createdAt: "" } });
  useBooksStore.setState({ selectedBookId: book.id, books: [book as never] });
  useCategoriesStore.setState({ categories: mockBackend.state.categories as never });
  useFilterStore.getState().clearAllScopes();
});

afterEach(async () => {
  await queryClient.cancelQueries();
  queryClient.clear();
});

describe("Activity screen (against the mock API)", () => {
  it("shows server totals and rows; quick filters and All refetch rows AND totals together", async () => {
    renderScreen();

    // Default filter is Today; the seeded month has no rows dated today unless today is a seed day.
    await waitFor(() => expect(screen.getByText("Spent")).toBeTruthy());

    fireEvent.press(screen.getByText("All"));
    // The whole seeded ledger: the header count is the server's matchedCount.
    const all = mockBackend.state.transactions.filter((t) => !t.deletedAt);
    await waitFor(() => expect(screen.getByText(new RegExp(`· ${all.length} transactions`))).toBeTruthy());

    // A quick type filter changes rows and totals together, via one applied query.
    fireEvent.press(screen.getByText("Income"));
    const income = all.filter((t) => t.type === "INCOME");
    await waitFor(() => expect(screen.getByText(new RegExp(`· ${income.length} transactions`))).toBeTruthy());
    expect(screen.getByLabelText("Clear all filters")).toBeTruthy();

    // Its chip appears in the applied-filter row, and Clear all restores everything.
    fireEvent.press(screen.getByLabelText("Clear all filters"));
    await waitFor(() => expect(screen.getByText(new RegExp(`· ${all.length} transactions`))).toBeTruthy());
  });

  it("a non-date sort gives a flat list in server order, with no day headers", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText("Spent")).toBeTruthy());
    fireEvent.press(screen.getByText("All"));
    // Date-primary (the default): day headers exist.
    await waitFor(() => expect(screen.getAllByText(/^[A-Z]{3,9} \d{1,2}$|^TODAY$|^YESTERDAY$/).length).toBeGreaterThan(0));

    fireEvent.press(screen.getByLabelText("Sort"));
    fireEvent.press(screen.getByText("Add sort"));
    fireEvent.press(screen.getAllByText("Date")[0]); // open the field picker of the first key
    fireEvent.press(screen.getAllByText("Amount").at(-1)!); // the sheet renders after the screen's own Amount chip
    fireEvent.press(screen.getByText("Apply"));

    await waitFor(() => expect(screen.getByText(/Sorted by Amount \(highest first\)/)).toBeTruthy());
    expect(screen.queryAllByText(/^[A-Z]{3,9} \d{1,2}$|^TODAY$|^YESTERDAY$/)).toHaveLength(0);
    // The list follows the server's order (highest amount first) once the new page lands.
    await waitFor(() => {
      const titles = screen.getAllByText(/Monthly salary|Rent|Side project|Electric bill/).map((n) => n.props.children);
      expect(titles.slice(0, 2)).toEqual(["Monthly salary", "Rent"]);
    });
  });

  it("description search commits 300ms after typing, as a single canonical condition", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText("Spent")).toBeTruthy());
    fireEvent.press(screen.getByText("All"));
    fireEvent.press(screen.getByLabelText("Search transactions"));

    jest.useFakeTimers();
    try {
      fireEvent.changeText(screen.getByPlaceholderText("Search title or note"), "Whole");
      fireEvent.changeText(screen.getByPlaceholderText("Search title or note"), "Whole Foods");
      const scope = Object.keys(useFilterStore.getState().byScope)[0];
      expect(JSON.stringify(useFilterStore.getState().byScope[scope].root)).not.toContain("Whole");
      act(() => jest.advanceTimersByTime(300));
      expect(JSON.stringify(useFilterStore.getState().byScope[scope].root)).toContain("Whole Foods");
    } finally {
      jest.useRealTimers();
    }
    await waitFor(() => expect(screen.getByText(/· 1 transaction$/)).toBeTruthy());
    expect(todayInTimeZone(book.timezone)).toMatch(/^\d{4}/);
  });

  it("tablet: a sortable table over the same query state, with the same rows", async () => {
    mockLayoutClass = "medium";
    renderScreen();
    await waitFor(() => expect(screen.getByText("Spent")).toBeTruthy());
    fireEvent.press(screen.getByText("All"));
    await waitFor(() => expect(screen.getByLabelText(/^Sort by Amount/)).toBeTruthy());
    // No day headers in the table: the Date column carries the day.
    expect(screen.queryAllByText(/^TODAY$|^YESTERDAY$/)).toHaveLength(0);

    fireEvent.press(screen.getByLabelText(/^Sort by Amount/));
    await waitFor(() => expect(screen.getByLabelText("Sort by Amount, currently descending")).toBeTruthy());
    const scope = Object.keys(useFilterStore.getState().byScope)[0];
    expect(useFilterStore.getState().byScope[scope].sort[0]).toEqual({ field: "amountMinor", direction: "DESC" });
    await waitFor(() => {
      const titles = screen.getAllByText(/Monthly salary|Rent|Side project|Electric bill/).map((n) => n.props.children);
      expect(titles.slice(0, 2)).toEqual(["Monthly salary", "Rent"]);
    });

    fireEvent.press(screen.getByLabelText(/^Sort by Amount/)); // same column again flips direction
    await waitFor(() => expect(useFilterStore.getState().byScope[scope].sort[0]).toEqual({ field: "amountMinor", direction: "ASC" }));
  });

  it("offline after a filter change: a plain error with Retry (no endless UPDATING); Retry recovers", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText("Spent")).toBeTruthy());
    mockBackend.offline = true;
    try {
      fireEvent.press(screen.getByText("All"));
      await waitFor(() => expect(screen.getByText("Couldn’t load transactions")).toBeTruthy(), { timeout: 3000 });
      expect(screen.queryByText("UPDATING…")).toBeNull();
      expect(screen.getByText(/Can't connect to server/)).toBeTruthy();
    } finally {
      mockBackend.offline = false;
    }
    fireEvent.press(screen.getAllByText("Retry")[0]);
    await waitFor(() => expect(screen.queryByText("Couldn’t load transactions")).toBeNull());
    await waitFor(() => expect(screen.getByText(/· \d+ transactions/)).toBeTruthy());
  });
});
