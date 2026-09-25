/**
 * The add/edit transaction screens against the mock API: the draft keeps its book through
 * step 1's reset (so the full category browser lists the book's categories), and payment
 * method can be picked, cleared, and edited.
 */
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { queryClient } from "@/shared/api/queryClient";
import { mockBackend } from "@/shared/api/mockAdapter";
import { useAuthStore } from "@/features/auth/store";
import { useBooksStore } from "@/features/books/store";
import { useCategoriesStore } from "@/features/categories/store";
import { useAddTransactionDraftStore } from "../addDraftStore";
import * as actions from "../actions";

import AddTransactionAmount from "@/app/modals/add-transaction";
import AddTransactionCategory from "@/app/modals/add-transaction/category";
import AddTransactionDetails from "@/app/modals/add-transaction/details";
import EditTransactionModal from "@/app/modals/edit-transaction";

let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => {
  const React = require("react");
  return {
    router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => mockParams,
    // Mirrors expo-router's fork: navigation "loads" one render after mount, and only then does
    // the effect fire - i.e. after the screen's own mount effects have already run.
    useFocusEffect: (effect: () => void) => {
      const [loaded, setLoaded] = React.useState(false);
      React.useEffect(() => setLoaded(true), []);
      React.useEffect(() => {
        if (loaded) return effect();
      }, [loaded, effect]);
    },
  };
});
jest.mock("@react-native-community/datetimepicker", () => ({ __esModule: true, default: () => null }));

const book = mockBackend.state.books[0];
const expenseCategory = mockBackend.state.categories.find((c) => c.bookId === book.id && c.type === "EXPENSE")!;

const renderScreen = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

beforeEach(() => {
  jest.restoreAllMocks();
  queryClient.clear();
  mockParams = {};
  useAuthStore.setState({ user: { id: "user-A", email: "a@x.io", defaultCurrencyCode: "USD", createdAt: "" } });
  useBooksStore.setState({ selectedBookId: book.id, books: [book as never] });
  useCategoriesStore.setState({ categories: mockBackend.state.categories as never });
  useAddTransactionDraftStore.getState().reset();
});

describe("category browser", () => {
  it("step 1's reset keeps the draft's book", async () => {
    useAddTransactionDraftStore.setState({ bookId: "" });
    renderScreen(<AddTransactionAmount />);
    await waitFor(() => expect(useAddTransactionDraftStore.getState().bookId).toBe(book.id));
    // Settled, not just passing through: the late focus effect must not wipe it afterwards.
    await act(async () => {});
    expect(useAddTransactionDraftStore.getState().bookId).toBe(book.id);
  });

  it("lists the book's categories", async () => {
    useAddTransactionDraftStore.setState({ bookId: book.id, kind: "EXPENSE" });
    renderScreen(<AddTransactionCategory />);
    expect((await screen.findAllByText(expenseCategory.name)).length).toBeGreaterThan(0);
    expect(screen.queryByText("No categories found")).toBeNull();
  });

  it("falls back to the selected book like step 2 does when the draft has none", async () => {
    useAddTransactionDraftStore.setState({ bookId: "", kind: "EXPENSE" });
    renderScreen(<AddTransactionCategory />);
    expect((await screen.findAllByText(expenseCategory.name)).length).toBeGreaterThan(0);
  });
});

describe("payment method", () => {
  const draft = () =>
    useAddTransactionDraftStore.setState({
      bookId: book.id,
      kind: "EXPENSE",
      amount: "12",
      categoryId: expenseCategory.id,
      categoryName: expenseCategory.name,
    });

  it("is sent on create when picked", async () => {
    const create = jest.spyOn(actions, "createTransaction").mockResolvedValue(null);
    draft();
    renderScreen(<AddTransactionDetails />);

    fireEvent.press(screen.getByText("Card"));
    fireEvent.press(screen.getByText("Save transaction"));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][2]).toMatchObject({ paymentMethod: "CARD" });
  });

  it("is omitted on create when unpicked, and pressing the picked chip clears it", async () => {
    const create = jest.spyOn(actions, "createTransaction").mockResolvedValue(null);
    draft();
    renderScreen(<AddTransactionDetails />);

    fireEvent.press(screen.getByText("Wallet"));
    expect(useAddTransactionDraftStore.getState().paymentMethod).toBe("WALLET");
    fireEvent.press(screen.getByText("Wallet"));
    expect(useAddTransactionDraftStore.getState().paymentMethod).toBeNull();

    fireEvent.press(screen.getByText("Save transaction"));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][2].paymentMethod).toBeUndefined();
  });

  it("can be changed on edit, and the server stores it", async () => {
    const row = mockBackend.state.transactions.find((t) => t.bookId === book.id && !t.deletedAt && t.paymentMethod === "CARD")!;
    mockParams = { id: row.id, bookId: book.id };

    renderScreen(<EditTransactionModal />);
    fireEvent.press(await screen.findByText("Bank transfer"));
    fireEvent.press(screen.getByText("Save changes"));
    await waitFor(() => expect(mockBackend.state.transactions.find((t) => t.id === row.id)!.paymentMethod).toBe("BANK_TRANSFER"));
  });
});
