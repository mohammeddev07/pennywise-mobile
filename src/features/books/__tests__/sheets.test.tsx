import React from "react";
import { Alert } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { BookSheets } from "../ui/BookSheets";
import { useBookUIStore } from "../ui/store";
import { normalizeBook, useBooksStore } from "../store";
import {
  resetBookOperations,
  beginBookOperation,
  endBookOperation,
} from "../operations";
const mockNavigate = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ navigate: mockNavigate }),
  router: { replace: jest.fn() },
}));
beforeEach(() => {
  jest.clearAllMocks();
  resetBookOperations();
  useBooksStore.setState({
    books: ["Personal", "Travel"].map((name, i) =>
      normalizeBook({ id: String(i), name, version: 1 }),
    ),
    selectedBookId: "0",
    ready: true,
    isManaging: false,
  });
  useBookUIStore.getState().open("switcher");
});
afterEach(() => {
  jest.restoreAllMocks();
  resetBookOperations();
});
it("closes with the header X and reopens without a stale sheet", () => {
  render(<BookSheets />);
  fireEvent.press(screen.getAllByLabelText("Close")[1]);
  expect(useBookUIStore.getState().sheet).toBeNull();
  expect(screen.queryByText("Cash books")).toBeNull();
  act(() => useBookUIStore.getState().open("switcher"));
  expect(screen.getByText("Cash books")).toBeTruthy();
  fireEvent.press(screen.getAllByLabelText("Close")[0]);
  expect(useBookUIStore.getState().sheet).toBeNull();
});
it("dismisses before navigating to the existing Profile books section", () => {
  mockNavigate.mockImplementation(() =>
    expect(useBookUIStore.getState().sheet).toBeNull(),
  );
  render(<BookSheets />);
  fireEvent.press(screen.getByLabelText("Manage cash books in Profile"));
  expect(mockNavigate).toHaveBeenCalledWith({
    pathname: "/(tabs)/settings",
    params: { section: "books" },
  });
});
it("opens creation from switcher and closes an untouched form", () => {
  render(<BookSheets />);
  fireEvent.press(screen.getByText("Add new book"));
  expect(screen.getByLabelText("Book name")).toBeTruthy();
  expect(screen.queryByText("Cash books")).toBeNull();
  fireEvent.press(screen.getAllByLabelText("Close")[1]);
  expect(useBookUIStore.getState().sheet).toBeNull();
});
it("opens a book menu and its editor", () => {
  render(<BookSheets />);
  fireEvent.press(screen.getByLabelText("Manage Travel"));
  fireEvent.press(screen.getByText("Rename or change icon/color"));
  expect(screen.getByLabelText("Book name").props.value).toBe("Travel");
});
it("explains blocked actions but keeps X working during an operation", () => {
  const operation = beginBookOperation();
  render(<BookSheets />);
  fireEvent.press(screen.getByText("Add new book"));
  expect(useBookUIStore.getState().sheet).toBe("switcher");
  expect(
    screen.getByText("Wait for the current operation to finish."),
  ).toBeTruthy();
  fireEvent.press(screen.getAllByLabelText("Close")[1]);
  expect(useBookUIStore.getState().sheet).toBeNull();
  act(() => endBookOperation(operation));
});
it("shows deletion failure inside the open modal and preserves the book", async () => {
  let confirm: (() => void) | undefined;
  jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
    confirm = buttons?.find((b) => b.style === "destructive")?.onPress;
  });
  const remove = jest
    .spyOn(useBooksStore.getState(), "removeBook")
    .mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          error: {
            code: "VERSION_CONFLICT",
            message: "Reload and confirm deletion again.",
          },
        },
      },
    });
  render(<BookSheets />);
  fireEvent.press(screen.getByLabelText("Manage Travel"));
  fireEvent.press(screen.getByText("Delete book"));
  expect(remove).not.toHaveBeenCalled();
  await act(async () => confirm?.());
  await waitFor(() =>
    expect(screen.getByRole("alert").props.children).toBe(
      "Reload and confirm deletion again.",
    ),
  );
  expect(useBooksStore.getState().books).toHaveLength(2);
  fireEvent.press(screen.getAllByLabelText("Close")[1]);
  expect(useBookUIStore.getState().error).toBeNull();
});
it("lets the current book be managed and drops the move buttons", () => {
  render(<BookSheets />);
  fireEvent.press(screen.getByLabelText("Manage Personal"));
  expect(screen.getByText("Delete book")).toBeTruthy();
  expect(screen.queryByText("Move up")).toBeNull();
  expect(screen.queryByText("Move down")).toBeNull();
});
it("closes the editor with X while a slow write is still running", () => {
  render(<BookSheets />);
  fireEvent.press(screen.getByText("Add new book"));
  act(() => useBooksStore.setState({ isManaging: true }));
  fireEvent.press(screen.getAllByLabelText("Close")[1]);
  expect(useBookUIStore.getState().sheet).toBeNull();
});
