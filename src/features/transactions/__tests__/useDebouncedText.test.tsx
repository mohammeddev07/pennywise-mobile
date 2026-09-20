import { act, renderHook } from "@testing-library/react-native";

import { TEXT_DEBOUNCE_MS, useDebouncedText } from "../ui/useDebouncedText";

describe("description input", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("commits once, 300ms after typing stops - never per keystroke", () => {
    const commit = jest.fn();
    const { result } = renderHook(({ applied }: { applied: string }) => useDebouncedText(applied, commit), { initialProps: { applied: "" } });
    expect(TEXT_DEBOUNCE_MS).toBe(300);

    act(() => result.current[1]("c"));
    act(() => jest.advanceTimersByTime(200));
    act(() => result.current[1]("co"));
    act(() => jest.advanceTimersByTime(299));
    expect(commit).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith("co");
    expect(result.current[0]).toBe("co");
  });

  it("follows an external change (removed chip, Clear all) without echoing it back", () => {
    const commit = jest.fn();
    const { result, rerender } = renderHook(({ applied }: { applied: string }) => useDebouncedText(applied, commit), { initialProps: { applied: "" } });
    act(() => result.current[1]("tea"));
    act(() => jest.advanceTimersByTime(300));
    rerender({ applied: "tea" }); // our own commit coming back must not disturb typing
    expect(result.current[0]).toBe("tea");
    rerender({ applied: "" }); // chip removed elsewhere
    expect(result.current[0]).toBe("");
    act(() => jest.advanceTimersByTime(1000));
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("does not re-commit an unchanged value", () => {
    const commit = jest.fn();
    const { result } = renderHook(() => useDebouncedText("abc", commit));
    act(() => result.current[1]("abc "));
    act(() => jest.advanceTimersByTime(300));
    expect(commit).not.toHaveBeenCalled();
  });
});
