import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { getGoogleIdToken } from "../google";
import { getAuthErrorMessage } from "@/shared/api/errors";
import { useAuthStore } from "../store";

jest.mock("@react-native-google-signin/google-signin", () => ({
  ...jest.requireActual("@react-native-google-signin/google-signin"),
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock("../google", () => ({
  ...jest.requireActual("../google"),
  googleSignInAvailable: true,
}));

const signIn = GoogleSignin.signIn as jest.Mock;

describe("getGoogleIdToken", () => {
  it("returns the ID token, and null when the user backs out", async () => {
    signIn.mockResolvedValueOnce({ type: "success", data: { idToken: "tok", user: {} } });
    await expect(getGoogleIdToken()).resolves.toBe("tok");
    signIn.mockResolvedValueOnce({ type: "cancelled", data: null });
    await expect(getGoogleIdToken()).resolves.toBeNull();
  });

  it("explains a SHA-1 / client mismatch instead of DEVELOPER_ERROR", async () => {
    signIn.mockRejectedValueOnce(Object.assign(new Error("DEVELOPER_ERROR"), { code: "10" }));
    await expect(getGoogleIdToken()).rejects.toThrow(/SHA-1/);
  });
});

it("tells an existing email account to link Google instead of a raw 409", () => {
  const error = {
    isAxiosError: true,
    response: { data: { error: { code: "GOOGLE_ACCOUNT_LINK_REQUIRED", message: "x" } } },
  };
  expect(getAuthErrorMessage(error)).toMatch(/connect Google in Profile/);
});

it("signs in with Google and enters the app", async () => {
  const { GoogleSignInButton } = require("../ui/GoogleSignInButton");
  signIn.mockResolvedValueOnce({ type: "success", data: { idToken: "tok", user: {} } });
  render(<GoogleSignInButton />);
  fireEvent.press(screen.getByText("Continue with Google"));
  await waitFor(() => expect(router.replace).toHaveBeenCalled());
  expect(useAuthStore.getState().sessionStatus).toBe("authenticated");
});
