import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { AmountFilterSheet } from "../ui/QuickFilterSheets";

const setup = (currency = "USD") => {
  const onChange = jest.fn();
  render(<AmountFilterSheet visible onClose={jest.fn()} currency={currency} min={null} max={null} onChange={onChange} />);
  return onChange;
};

describe("amount range", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("applies exact minor units 300ms after typing stops", () => {
    const onChange = setup();
    fireEvent.changeText(screen.getAllByPlaceholderText("Any")[0], "19.99");
    fireEvent.changeText(screen.getAllByPlaceholderText("Any")[1], "1,000");
    act(() => jest.advanceTimersByTime(299));
    expect(onChange).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(1999, 100000);
  });

  it("never applies invalid or reversed input; explains instead", () => {
    const onChange = setup();
    fireEvent.changeText(screen.getAllByPlaceholderText("Any")[0], "1.005");
    act(() => jest.advanceTimersByTime(500));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/at most 2 decimals/)).toBeTruthy();

    fireEvent.changeText(screen.getAllByPlaceholderText("Any")[0], "50");
    fireEvent.changeText(screen.getAllByPlaceholderText("Any")[1], "10");
    act(() => jest.advanceTimersByTime(500));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/minimum must not be more/)).toBeTruthy();
  });

  it("JPY takes whole units only", () => {
    const onChange = setup("JPY");
    fireEvent.changeText(screen.getAllByPlaceholderText("Any")[0], "500.5");
    act(() => jest.advanceTimersByTime(500));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getAllByPlaceholderText("Any")[0], "500");
    act(() => jest.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledWith(500, null);
  });
});
