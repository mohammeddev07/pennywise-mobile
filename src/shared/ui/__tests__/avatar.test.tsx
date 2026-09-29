import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Avatar, avatarTraits } from "../components/Avatar";

it("draws the same face for a seed and varies across seeds", () => {
  expect(avatarTraits(42)).toEqual(avatarTraits(42));
  const colors = new Set(Array.from({ length: 50 }, (_, i) => avatarTraits(i).color));
  expect(colors.size).toBeGreaterThan(3);
});
it("shuffles on tap", () => {
  const onShuffle = jest.fn();
  render(<Avatar seed={1} onShuffle={onShuffle} />);
  fireEvent.press(screen.getByLabelText("Profile picture"));
  expect(onShuffle).toHaveBeenCalledTimes(1);
});
