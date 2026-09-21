import React from "react";
import { Platform } from "react-native";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

import { AdvancedFilterSheet } from "../ui/AdvancedFilterSheet";
import { describeExpression, type DescribeContext, type FilterGroupNode } from "../filterModel";
import { makeScope, useFilterStore } from "../filterStore";

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: jest.fn(() => null),
  DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
}));

const scope = makeScope("user-A", "book-1");
const model = { currency: "USD", timezone: "UTC" };
const describeCtx: DescribeContext = { ...model, today: "2026-03-15", categoryName: (id) => id };
const categories = [{ id: "c1", name: "Groceries", type: "EXPENSE" as const }];

const sheet = (visible = true, onClose = jest.fn()) => (
  <AdvancedFilterSheet visible={visible} onClose={onClose} scope={scope} model={model} describeContext={describeCtx} categories={categories} />
);
const applied = () => useFilterStore.getState().byScope[scope].root;
const draft = () => useFilterStore.getState().drafts[scope]!.root;

beforeEach(() => {
  useFilterStore.getState().clearAllScopes();
  useFilterStore.getState().ensure(scope, "2026-03-15");
});

describe("Advanced filter sheet", () => {
  describe("Android date dialog", () => {
    const open = DateTimePickerAndroid.open as jest.Mock;
    beforeEach(() => {
      jest.replaceProperty(Platform, "OS", "android");
      open.mockClear();
    });
    afterEach(() => jest.restoreAllMocks());

    it("steps the sheet aside for the dialog, then returns it with the pick in the draft", () => {
      const onClose = jest.fn();
      render(sheet(true, onClose));
      const before = applied();

      fireEvent.press(screen.getAllByLabelText(/^Date /)[0]);
      expect(open).toHaveBeenCalledTimes(1);
      // Never presented over the sheet's Modal: the sheet is out of the way.
      expect(screen.queryByText("Apply")).toBeNull();

      act(() => open.mock.calls[0][0].onValueChange({}, new Date(2026, 1, 3, 0, 30)));
      expect(screen.getByText("Apply")).toBeTruthy();
      expect(onClose).not.toHaveBeenCalled(); // stepping aside is not closing
      expect(JSON.stringify(draft().children[0])).toContain("2026-02-03");
      expect(applied()).toBe(before); // still only a draft until Apply
    });

    it("dismiss changes nothing, and a failed dialog does not leave dates dead", () => {
      render(sheet());
      const start = JSON.stringify(draft().children[0]);
      fireEvent.press(screen.getAllByLabelText(/^Date /)[0]);
      act(() => open.mock.calls[0][0].onDismiss());
      expect(JSON.stringify(draft().children[0])).toBe(start);

      fireEvent.press(screen.getAllByLabelText(/^Date /)[1]);
      act(() => open.mock.calls[1][0].onError(new Error("no window")));
      fireEvent.press(screen.getAllByLabelText(/^Date /)[0]);
      expect(open).toHaveBeenCalledTimes(3);
      expect(open.mock.calls[0][0].onChange).toBeUndefined(); // not the deprecated API
    });
  });

  it("edits AND/OR structure on a draft; Apply commits it atomically", () => {
    const onClose = jest.fn();
    render(sheet(true, onClose));
    const before = applied();

    // Root: add a condition, then a nested group, then flip the nested group to AND.
    fireEvent.press(screen.getAllByText("Add condition")[0]);
    fireEvent.press(screen.getAllByText("Add group")[0]);
    expect(draft().children).toHaveLength(3); // date, condition, group
    const group = draft().children[2] as FilterGroupNode;
    expect(group.kind).toBe("group");
    expect(group.op).toBe("OR");
    expect(group.children).toHaveLength(1);

    fireEvent.press(screen.getAllByText("AND · all match")[1]);
    expect((draft().children[2] as FilterGroupNode).op).toBe("AND");

    // Type into the first blank condition's value; a group condition too.
    const inputs = screen.getAllByPlaceholderText("Text (not case-sensitive)");
    fireEvent.changeText(inputs[0], "coffee");
    fireEvent.changeText(inputs[1], "tea");

    // Nothing has reached the applied filter yet.
    expect(applied()).toBe(before);
    expect(screen.getByLabelText("Filter expression preview").props.children.join("")).toMatch(/coffee/);

    fireEvent.press(screen.getByText("Apply"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(applied()).not.toBe(before);
    expect(describeExpression(applied(), describeCtx)).toMatch(/“coffee”/);
    expect(describeExpression(applied(), describeCtx)).toMatch(/\(Description \(title or note\) contains “tea”\)/);
    expect(useFilterStore.getState().drafts[scope]).toBeUndefined();
  });

  it("Cancel drops the draft and leaves the applied filter untouched", () => {
    const onClose = jest.fn();
    render(sheet(true, onClose));
    const before = applied();
    fireEvent.press(screen.getAllByText("Add condition")[0]);
    fireEvent.changeText(screen.getAllByPlaceholderText("Text (not case-sensitive)")[0], "x");
    fireEvent.press(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(applied()).toBe(before);
    expect(useFilterStore.getState().drafts[scope]).toBeUndefined();
  });

  it("an invalid draft is not applied; the offending condition is flagged and the sheet stays open", () => {
    const onClose = jest.fn();
    render(sheet(true, onClose));
    const before = applied();
    fireEvent.press(screen.getAllByText("Add condition")[0]); // blank text value
    fireEvent.press(screen.getByText("Apply"));
    expect(onClose).not.toHaveBeenCalled();
    expect(applied()).toBe(before);
    expect(screen.getByText("Enter a value.")).toBeTruthy();
  });

  it("removes and reorders conditions; Clear all empties the draft", () => {
    render(sheet());
    fireEvent.press(screen.getAllByText("Add condition")[0]);
    fireEvent.press(screen.getAllByText("Add condition")[0]);
    fireEvent.changeText(screen.getAllByPlaceholderText("Text (not case-sensitive)")[0], "first");
    fireEvent.changeText(screen.getAllByPlaceholderText("Text (not case-sensitive)")[1], "second");
    const values = () => draft().children.filter((c) => c.kind === "condition" && c.field === "description").map((c) => (c as { value: string }).value);
    expect(values()).toEqual(["first", "second"]);

    // Index 0 is the date condition the default filter starts with; 1 and 2 are ours.
    fireEvent.press(screen.getAllByLabelText("Move condition down")[1]);
    expect(values()).toEqual(["second", "first"]);
    fireEvent.press(screen.getAllByLabelText("Remove condition")[1]);
    expect(values()).toEqual(["first"]);

    fireEvent.press(screen.getByText("Clear all conditions"));
    expect(draft().children).toHaveLength(0);
  });

  it("lists every server field, including read-only metadata, in the field picker", () => {
    render(sheet());
    fireEvent.press(screen.getAllByText("Add condition")[0]);
    // The blank condition is "Description (title or note)". Open its field picker.
    const fieldChip = screen.getAllByText("Description (title or note)").find((n) => n.parent) as never;
    fireEvent.press(fieldChip);
    for (const label of ["Title", "Note", "Amount", "Date", "Type", "Category", "Category name", "Payment method", "Time of event", "Transaction ID", "Created", "Updated", "Import ID"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("RECORD METADATA (READ-ONLY)")).toBeTruthy();
    fireEvent.press(within(screen.root).getAllByText("Payment method")[0]);
  });
});
