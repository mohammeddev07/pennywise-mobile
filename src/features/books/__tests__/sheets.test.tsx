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
it("closes the editor with X while a slow write is still running", async () => {
  render(<BookSheets />);
  fireEvent.press(screen.getByText("Add new book"));
  await act(async () => { useBooksStore.setState({ isManaging: true }); });
  fireEvent.press(screen.getAllByLabelText("Close")[1]);
  expect(useBookUIStore.getState().sheet).toBeNull();
});

it("keeps one native modal mounted across the list, menu and editor", () => {
  render(<BookSheets />);
  const host = screen.UNSAFE_getByType(require("react-native").Modal);
  fireEvent.press(screen.getByLabelText("Manage Travel"));
  expect(screen.UNSAFE_getByType(require("react-native").Modal)).toBe(host);
  fireEvent.press(screen.getByText("Rename or change icon/color"));
  expect(screen.UNSAFE_getByType(require("react-native").Modal)).toBe(host);
  expect(
    screen
      .getByTestId("sheet-drag-handle")
      .findAllByProps({ accessibilityLabel: "Close" }),
  ).toHaveLength(0);
  const keyboardView = screen.UNSAFE_getByType(
    require("react-native").KeyboardAvoidingView,
  );
  expect(keyboardView.props.style).toMatchObject({
    flex: 1,
    justifyContent: "flex-end",
  });
});

it("switches books on the first press across repeated reopenings", async () => {
  render(<BookSheets />);
  for (const [id, name] of [
    ["1", "Travel"],
    ["0", "Personal"],
    ["1", "Travel"],
  ]) {
    act(() => useBookUIStore.getState().open("switcher"));
    await act(async () =>
      fireEvent.press(screen.getByLabelText(`Switch to ${name}`)),
    );
    expect(useBooksStore.getState().selectedBookId).toBe(id);
    expect(useBookUIStore.getState().sheet).toBeNull();
  }
});

it("saves a rename, icon and color selected with one press each", async () => {
  const update = jest
    .spyOn(useBooksStore.getState(), "updateBook")
    .mockResolvedValue(undefined);
  render(<BookSheets />);
  fireEvent.press(screen.getByLabelText("Manage Travel"));
  fireEvent.press(screen.getByText("Rename or change icon/color"));
  fireEvent.changeText(screen.getByLabelText("Book name"), "Holidays");
  fireEvent.press(screen.getByLabelText("blue book color"));
  fireEvent.press(screen.getByLabelText("airplane book icon"));
  expect(
    screen.getByLabelText("blue book color").props.accessibilityState.checked,
  ).toBe(true);
  expect(
    screen.getByLabelText("airplane book icon").props.accessibilityState
      .checked,
  ).toBe(true);
  await act(async () => fireEvent.press(screen.getByText("Save changes")));
  expect(update).toHaveBeenCalledWith("1", {
    name: "Holidays",
    color: "blue",
    icon: "airplane",
  });
  expect(useBookUIStore.getState().sheet).toBeNull();
});

it("uses the editor discard guard for native Back and resets it after close", () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  render(<BookSheets />);
  fireEvent.press(screen.getByText("Add new book"));
  fireEvent.changeText(screen.getByLabelText("Book name"), "Unsaved");
  const host = screen.UNSAFE_getByType(require("react-native").Modal);
  act(() => host.props.onRequestClose());
  expect(alert).toHaveBeenCalledWith(
    "Discard new book?",
    expect.any(String),
    expect.any(Array),
  );
  expect(useBookUIStore.getState().sheet).toBe("create");
  act(() => useBookUIStore.getState().close());
  act(() => useBookUIStore.getState().open("switcher"));
  act(() => host.props.onRequestClose());
  expect(useBookUIStore.getState().sheet).toBeNull();
  expect(alert).toHaveBeenCalledTimes(1);
});
