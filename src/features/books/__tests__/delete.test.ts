import { Alert } from "react-native";
import { confirmDeleteBook } from "../deleteBook";
import { useBooksStore, normalizeBook } from "../store";
import { useBookUIStore } from "../ui/store";
import { queryClient } from "@/shared/api/queryClient";
import { waitFor } from "@testing-library/react-native";
import { useCategoriesStore } from "@/features/categories/store";
import { useBudgetsStore } from "@/features/budgets/store";
import { mockBackend } from "@/shared/api/mockAdapter";
import * as api from "@/shared/api/books";
import { beginBookOperation, endBookOperation } from "../operations";
let confirm: (() => void) | undefined;
let alert: jest.SpyInstance;
beforeEach(() => {
  confirm = undefined;
  alert = jest
    .spyOn(Alert, "alert")
    .mockImplementation((_title, _message, buttons) => {
      confirm = buttons?.find((b) => b.style === "destructive")?.onPress;
    });
  useBooksStore.setState({
    books: ["a", "b"].map((id) => normalizeBook({ id, name: id, version: 1 })),
    selectedBookId: "a",
    ready: true,
    isManaging: false,
  });
});
afterEach(() => {
  jest.restoreAllMocks();
  queryClient.clear();
});
it("describes inaccessible transactions and does not delete on cancel", () => {
  const remove = jest.spyOn(useBooksStore.getState(), "removeBook");
  confirmDeleteBook("a");
  expect(alert.mock.calls[0][1]).toContain("all its transactions");
  expect(alert.mock.calls[0][1]).toContain("cannot be undone");
  expect(remove).not.toHaveBeenCalled();
});
it("blocks the last book and active operations before confirmation", () => {
  const operation = beginBookOperation();
  confirmDeleteBook("a");
  expect(confirm).toBeUndefined();
  endBookOperation(operation);
  useBooksStore.setState((s) => ({ books: [s.books[0]] }));
  confirmDeleteBook("a");
  expect(confirm).toBeUndefined();
});
it("requires a fresh confirmation when the displayed version changes", async () => {
  const remove = jest.spyOn(useBooksStore.getState(), "removeBook");
  confirmDeleteBook("a");
  useBooksStore.setState((s) => ({
    books: s.books.map((b) => ({ ...b, version: 2 })),
  }));
  confirm?.();
  await Promise.resolve();
  expect(remove).not.toHaveBeenCalled();
});
it("removes only confirmed book caches and selects the first remaining book", async () => {
  const state = JSON.parse(JSON.stringify(mockBackend.state));
  try {
    mockBackend.state.books = [];
    const a = await api.createBook("A", "USD", "UTC");
    const b = await api.createBook("B", "USD", "UTC");
    await useBooksStore.getState().loadBooks();
    useBooksStore.getState().setSelectedBookId(b.id);
    queryClient.setQueryData(["balance", b.id], { balanceMinor: 9 });
    queryClient.setQueryData(["balance", a.id], { balanceMinor: 7 });
    useCategoriesStore.setState({
      categories: mockBackend.state.categories as never,
    });
    useBudgetsStore.setState({ budgets: [] });
    useBookUIStore.getState().open("menu", b.id);
    confirmDeleteBook(b.id);
    confirm?.();
    await waitFor(() => expect(useBookUIStore.getState().sheet).toBeNull());
    expect(useBooksStore.getState().selectedBookId).toBe(a.id);
    expect(queryClient.getQueryData(["balance", b.id])).toBeUndefined();
    expect(queryClient.getQueryData(["balance", a.id])).toEqual({
      balanceMinor: 7,
    });
    expect(
      useCategoriesStore.getState().categories.some((c) => c.bookId === b.id),
    ).toBe(false);
  } finally {
    Object.assign(mockBackend.state, state);
  }
});
it("retains selection and books on failed deletion", async () => {
  const remove = jest
    .spyOn(useBooksStore.getState(), "removeBook")
    .mockRejectedValue(new Error("offline"));
  confirmDeleteBook("a");
  confirm?.();
  await waitFor(() => expect(remove).toHaveBeenCalled());
  expect(useBooksStore.getState().selectedBookId).toBe("a");
  expect(useBooksStore.getState().books).toHaveLength(2);
});
