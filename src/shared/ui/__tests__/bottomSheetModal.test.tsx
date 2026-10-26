import React, { useState } from "react";
import { Modal, Pressable, Text } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";

import { BottomSheetModal, SheetCloseButton } from "../components/BottomSheetModal";

function SheetHarness({ onApply, onScreenPress }: {
  onApply: () => void;
  onScreenPress: () => void;
}) {
  const [visible, setVisible] = useState(true);
  const close = () => setVisible(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Open filters" onPress={() => setVisible(true)}>
        <Text>Open filters</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Screen action" onPress={onScreenPress}>
        <Text>Screen action</Text>
      </Pressable>
      <BottomSheetModal
        visible={visible}
        title="Filters"
        onClose={close}
        rightAction={<SheetCloseButton onPress={close} />}
        footer={
          <Pressable accessibilityRole="button" accessibilityLabel="Apply filters" onPress={() => { onApply(); close(); }}>
            <Text>Apply filters</Text>
          </Pressable>
        }
      >
        <Text>Filter choices</Text>
      </BottomSheetModal>
    </>
  );
}

function setup() {
  const onApply = jest.fn();
  const onScreenPress = jest.fn();
  render(<SheetHarness onApply={onApply} onScreenPress={onScreenPress} />);
  return { onApply, onScreenPress };
}

it.each([State.END, State.CANCELLED, State.FAILED])(
  "keeps footer and close actions responsive after a partial swipe ending with state %s",
  (state) => {
    const { onApply } = setup();
    act(() => fireGestureHandler(getByGestureTestId("sheet-swipe"), [
      { state: State.BEGAN, translationY: 0 },
      { state: State.ACTIVE, translationY: 40 },
      { state, translationY: 40, velocityY: 0 },
    ]));
    expect(screen.getByText("Filter choices")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Filter choices")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Open filters" }));
    fireEvent.press(screen.getAllByRole("button", { name: "Close" })[1]);
    expect(screen.queryByText("Filter choices")).toBeNull();
  },
);

it("removes sheet content after a completed swipe and allows another immediate open", () => {
  const { onApply, onScreenPress } = setup();
  act(() => fireGestureHandler(getByGestureTestId("sheet-swipe"), [
    { state: State.BEGAN, translationY: 0 },
    { state: State.ACTIVE, translationY: 120 },
    { state: State.END, translationY: 120, velocityY: 0 },
  ]));
  expect(screen.queryByText("Filter choices")).toBeNull();
  expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
  fireEvent.press(screen.getByRole("button", { name: "Screen action" }));
  expect(onScreenPress).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole("button", { name: "Open filters" }));
  fireEvent.press(screen.getByRole("button", { name: "Apply filters" }));
  expect(onApply).toHaveBeenCalledTimes(1);
});

it("handles rapid backdrop, native Back, and reopen cycles without leaving sheet content mounted", () => {
  const { onApply } = setup();
  for (let i = 0; i < 3; i++) {
    fireEvent.press(screen.getAllByRole("button", { name: "Close" })[0]);
    expect(screen.queryByText("Filter choices")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Open filters" }));
    act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());
    expect(screen.queryByText("Filter choices")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Open filters" }));
    fireEvent.press(screen.getByRole("button", { name: "Apply filters" }));
    expect(onApply).toHaveBeenCalledTimes(i + 1);
    expect(screen.queryByText("Filter choices")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Open filters" }));
  }
});
