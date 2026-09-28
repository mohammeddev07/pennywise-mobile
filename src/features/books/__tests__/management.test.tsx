import React from "react";
import {
  render,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { BookManagement } from "../ui/BookManagement";
import { BookEditor } from "../ui/BookEditor";
import { normalizeBook, useBooksStore } from "../store";
import { movedBookIds } from "../reorder";
import { useBookUIStore } from "../ui/store";
const books = ["Personal", "Travel", "Business"].map((name, i) =>
  normalizeBook({
    id: String(i),
    name,
    currencyCode: "USD",
    balanceMinor: 123,
    icon: "book",
    color: "green",
  }),
);
beforeEach(() => {
  useBooksStore.setState({
    books,
    selectedBookId: "0",
    ready: true,
    isManaging: false,
  });
  useBookUIStore.getState().close();
});
afterEach(() => jest.restoreAllMocks());
it("moves exact IDs and rejects out of range moves", () => {
  expect(movedBookIds(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  expect(movedBookIds(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  expect(movedBookIds(["a", "b"], 0, -1)).toEqual(["a", "b"]);
});
it("exposes first-class accessible moves and keeps the selected book", async () => {
  const reorder = jest
    .spyOn(useBooksStore.getState(), "reorderBooks")
    .mockResolvedValue();
  render(<BookManagement />);
  const handle = screen.getByLabelText("Reorder Personal");
  expect(handle.props.accessibilityActions).toEqual([
    { name: "increment", label: "Move down" },
  ]);
  fireEvent(handle, "accessibilityAction", {
    nativeEvent: { actionName: "increment" },
  });
  await waitFor(() => expect(reorder).toHaveBeenCalledWith(["1", "0", "2"]));
  expect(useBooksStore.getState().selectedBookId).toBe("0");
});
it("edits only changed fields and never writes display defaults for unknown server keys", async () => {
  const update = jest
    .spyOn(useBooksStore.getState(), "updateBook")
    .mockResolvedValue();
  render(
    <BookEditor
      book={{ ...books[0], icon: "future-icon", color: "future-color" }}
    />,
  );
  fireEvent.press(screen.getByText("Save changes"));
  expect(update).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText("Book name"), "  Renamed  ");
  fireEvent.press(screen.getByText("Save changes"));
  await waitFor(() =>
    expect(update).toHaveBeenCalledWith("0", { name: "Renamed" }),
  );
  expect(screen.queryByLabelText("Currency USD")).toBeNull();
});
it("disables management actions while a request is pending", () => {
  useBooksStore.setState({ isManaging: true });
  render(<BookManagement />);
  fireEvent.press(screen.getByLabelText("Manage Travel"));
  expect(useBookUIStore.getState().sheet).toBeNull();
});
