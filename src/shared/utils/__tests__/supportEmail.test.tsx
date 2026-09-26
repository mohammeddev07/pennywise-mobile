import React from "react";
import { Linking } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ProfileScreen from "@/app/(tabs)/settings";
import { openSupportEmail, SUPPORT_EMAIL, SUPPORT_MAILTO } from "../supportEmail";

const NO_MAIL_APP = /No mail app is set up/;

// jest-expo already stubs `Linking.openURL` with one shared mock, so its call log must be cleared per test.
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

test("the mailto link is addressed to support with the subject filled in", () => {
  expect(SUPPORT_MAILTO).toBe("mailto:cntc.mak@gmail.com?subject=Pennywise%20Support");
});

test("openSupportEmail reports whether a mail app took the link", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValueOnce(true).mockRejectedValueOnce(new Error("No app"));
  await expect(openSupportEmail()).resolves.toBe(true);
  await expect(openSupportEmail()).resolves.toBe(false);
  expect(open).toHaveBeenCalledWith(SUPPORT_MAILTO);
});

test("Profile opens the mail app, and only shows the copyable address when none is set up", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValueOnce(true).mockRejectedValueOnce(new Error("No app"));
  const screen = render(<ProfileScreen />);

  fireEvent.press(screen.getByText("Contact support"));
  await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(NO_MAIL_APP)).toBeNull();

  fireEvent.press(screen.getByText("Contact support"));
  await waitFor(() => expect(screen.getByText(NO_MAIL_APP)).toBeTruthy());
  // The row's value plus the fallback line; the fallback copy must be selectable to be copyable.
  const addresses = screen.getAllByText(SUPPORT_EMAIL);
  expect(addresses.some((node) => node.props.selectable === true)).toBe(true);
});
