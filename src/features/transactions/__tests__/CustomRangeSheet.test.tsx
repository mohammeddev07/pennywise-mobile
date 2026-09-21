import React from "react";
import { Platform } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

import { CustomRangeSheet, rangeError } from "../ui/CustomRangeSheet";

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: jest.fn(() => null),
  DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
}));

const open = DateTimePickerAndroid.open as jest.Mock;
const Picker = DateTimePicker as unknown as jest.Mock;

const props = () => ({
  visible: true,
  onClose: jest.fn(),
  onApply: jest.fn(),
  onReset: jest.fn(),
  initial: { startDate: "2026-03-01", endDate: "2026-03-10" },
});

const setPlatform = (os: "android" | "ios" | "web") => jest.replaceProperty(Platform, "OS", os);

afterEach(() => {
  jest.restoreAllMocks();
  open.mockClear();
  (DateTimePickerAndroid.dismiss as jest.Mock).mockClear();
  Picker.mockClear();
});

describe("custom range picker lifecycle", () => {
  it("Android: one dialog per tap, never re-opened by re-renders, dismiss changes nothing", () => {
    setPlatform("android");
    const p = props();
    const { rerender } = render(<CustomRangeSheet {...p} />);

    // Unrelated re-renders (even with a new `initial` object of equal value) do not open anything.
    rerender(<CustomRangeSheet {...p} initial={{ ...p.initial }} />);
    rerender(<CustomRangeSheet {...p} />);
    expect(open).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText(/^Start date/));
    expect(open).toHaveBeenCalledTimes(1);
    // The dialog is never presented over the sheet's Modal: the sheet steps
    // aside, which also means there is no tile left to stack a second dialog.
    expect(screen.queryByLabelText(/^Start date/)).toBeNull();
    expect(screen.queryByLabelText(/^End date/)).toBeNull();

    rerender(<CustomRangeSheet {...p} />);
    expect(open).toHaveBeenCalledTimes(1);

    // Cancel / back / tap-outside: the sheet comes back and the draft is untouched.
    act(() => open.mock.calls[0][0].onDismiss());
    expect(screen.getByLabelText(/^Start date/)).toBeTruthy();
    expect(p.onClose).not.toHaveBeenCalled(); // stepping aside is not closing
    fireEvent.press(screen.getByText("Apply"));
    expect(p.onApply).toHaveBeenCalledWith({ startDate: "2026-03-01", endDate: "2026-03-10" });
    expect(open).toHaveBeenCalledTimes(1); // dismissing did not reopen it
  });

  it("Android: a dialog that fails to present does not leave the tiles dead", () => {
    setPlatform("android");
    const p = props();
    render(<CustomRangeSheet {...p} />);
    fireEvent.press(screen.getByLabelText(/^Start date/));
    act(() => open.mock.calls[0][0].onError(new Error("no window")));
    // The sheet is back and a second tap opens a fresh dialog.
    fireEvent.press(screen.getByLabelText(/^End date/));
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("Android: uses the current picker API, not the deprecated onChange", () => {
    setPlatform("android");
    render(<CustomRangeSheet {...props()} />);
    fireEvent.press(screen.getByLabelText(/^Start date/));
    const args = open.mock.calls[0][0];
    expect(args.onChange).toBeUndefined();
    expect(typeof args.onValueChange).toBe("function");
    expect(typeof args.onDismiss).toBe("function");
  });

  it("Android: a chosen date becomes a calendar day, not a UTC-shifted one", () => {
    setPlatform("android");
    const p = props();
    render(<CustomRangeSheet {...p} />);
    fireEvent.press(screen.getByLabelText(/^End date/));
    // 00:30 local on 20 Mar is 19 Mar in UTC (the suite runs in Asia/Tokyo).
    act(() => open.mock.calls[0][0].onValueChange({}, new Date(2026, 2, 20, 0, 30)));
    fireEvent.press(screen.getByText("Apply"));
    expect(p.onApply).toHaveBeenCalledWith({ startDate: "2026-03-01", endDate: "2026-03-20" });
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });

  it("Android: a reversed range is normalised on Apply", () => {
    setPlatform("android");
    const p = props();
    render(<CustomRangeSheet {...p} />);
    fireEvent.press(screen.getByLabelText(/^Start date/));
    act(() => open.mock.calls[0][0].onValueChange({}, new Date(2026, 3, 5, 12)));
    fireEvent.press(screen.getByText("Apply"));
    expect(p.onApply).toHaveBeenCalledWith({ startDate: "2026-03-10", endDate: "2026-04-05" });
  });

  it("Cancel closes once without applying; Reset resets then closes", () => {
    setPlatform("android");
    const p = props();
    const { unmount } = render(<CustomRangeSheet {...p} />);
    fireEvent.press(screen.getByText("Cancel"));
    expect(p.onClose).toHaveBeenCalledTimes(1);
    expect(p.onApply).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    unmount();

    const q = props();
    render(<CustomRangeSheet {...q} />);
    fireEvent.press(screen.getByText("Reset"));
    expect(q.onReset).toHaveBeenCalledTimes(1);
    expect(q.onClose).toHaveBeenCalledTimes(1);
    expect(q.onApply).not.toHaveBeenCalled();
  });

  it("closing the sheet takes an open Android dialog with it and never re-opens", () => {
    setPlatform("android");
    const p = props();
    const { rerender } = render(<CustomRangeSheet {...p} />);
    fireEvent.press(screen.getByLabelText(/^Start date/));
    rerender(<CustomRangeSheet {...p} visible={false} />);
    expect(DateTimePickerAndroid.dismiss).toHaveBeenCalledWith("date");
    rerender(<CustomRangeSheet {...p} visible={false} />);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("iOS: exactly one spinner, for the field being edited; confirmation is Apply", () => {
    setPlatform("ios");
    const p = props();
    render(<CustomRangeSheet {...p} />);
    const lastProps = () => Picker.mock.calls.at(-1)![0];

    expect(Picker.mock.calls.length).toBeGreaterThan(0);
    expect(lastProps().value.getDate()).toBe(1); // start
    act(() => lastProps().onChange({}, new Date(2026, 2, 4, 23, 45)));
    fireEvent.press(screen.getByLabelText(/^End date/));
    expect(lastProps().value.getDate()).toBe(10); // now the end
    expect(open).not.toHaveBeenCalled(); // no Android dialog on iOS

    fireEvent.press(screen.getByText("Apply"));
    expect(p.onApply).toHaveBeenCalledWith({ startDate: "2026-03-04", endDate: "2026-03-10" });
  });

  it("web: a native date input drives the draft (no picker component at all)", () => {
    setPlatform("web");
    const p = props();
    const { UNSAFE_getByType } = render(<CustomRangeSheet {...p} />);
    expect(Picker).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    const input = UNSAFE_getByType("input" as never);
    expect(input.props.value).toBe("2026-03-01");
    act(() => input.props.onChange({ target: { value: "2026-03-25" } }));
    fireEvent.press(screen.getByText("Apply"));
    expect(p.onApply).toHaveBeenCalledWith({ startDate: "2026-03-10", endDate: "2026-03-25" });
  });

  it("refuses ranges the analyze endpoint would reject", () => {
    expect(rangeError("2020-01-01", "2026-01-01")).toMatch(/5 years/);
    expect(rangeError("2021-03-01", "2026-03-01")).toBeNull();
    setPlatform("android");
    const p = { ...props(), initial: { startDate: "2019-01-01", endDate: "2026-01-01" } };
    render(<CustomRangeSheet {...p} />);
    fireEvent.press(screen.getByText("Apply"));
    expect(p.onApply).not.toHaveBeenCalled();
  });
});
