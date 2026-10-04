import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { getGoogleIdToken } from "../google";
import { getAuthErrorMessage } from "@/shared/api/errors";
import { useAuthStore } from "../store";
import * as authApi from "@/shared/api/auth";

jest.mock("@react-native-google-signin/google-signin", () => ({
  ...jest.requireActual("@react-native-google-signin/google-signin"),
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock("../google", () => {
  const { Platform, TurboModuleRegistry } = require("react-native");
  Platform.OS = "android";
  jest.spyOn(TurboModuleRegistry, "get").mockReturnValue({});
  return jest.requireActual("../google");
});
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { executionEnvironment: "bare" },
  ExecutionEnvironment: { StoreClient: "storeClient" },
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

  it("treats native cancellation as no sign-in", async () => {
    signIn.mockRejectedValueOnce(Object.assign(new Error("cancelled"), { code: statusCodes.SIGN_IN_CANCELLED }));
    await expect(getGoogleIdToken()).resolves.toBeNull();
  });

  it("rejects a successful picker response without an ID token", async () => {
    signIn.mockResolvedValueOnce({ type: "success", data: { idToken: null, user: {} } });
    await expect(getGoogleIdToken()).rejects.toThrow(/didn't return a sign-in token/);
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

it("shows the password-and-link route when Google finds an existing email", async () => {
  const { GoogleSignInButton } = require("../ui/GoogleSignInButton");
  const google = jest.spyOn(authApi, "google").mockRejectedValueOnce({
    isAxiosError: true,
    response: { data: { error: { code: "GOOGLE_ACCOUNT_LINK_REQUIRED" } } },
  });
  signIn.mockResolvedValueOnce({ type: "success", data: { idToken: "tok", user: {} } });
  render(<GoogleSignInButton />);
  fireEvent.press(screen.getByText("Continue with Google"));
  await waitFor(() => expect(screen.getByText(/Log in with your password, then connect Google in Profile/)).toBeTruthy());
  expect(google).toHaveBeenCalledWith("tok");
  google.mockRestore();
});

it("links Google to an authenticated account through the link endpoint", async () => {
  const { ConnectGoogleRow } = require("../ui/ConnectGoogleRow");
  const link = jest.spyOn(authApi, "linkGoogle");
  signIn.mockResolvedValueOnce({ type: "success", data: { idToken: "link-tok", user: {} } });
  render(<ConnectGoogleRow />);
  fireEvent.press(screen.getByText("Connect Google"));
  await waitFor(() => expect(screen.getByText("Connected")).toBeTruthy());
  expect(link).toHaveBeenCalledWith("link-tok");
  link.mockRestore();
});

 it.each([
  ["services", /Google Play services is unavailable/],
  ["configuration", /check the Android client's SHA-1/],
  ["missing-token", /didn't return a sign-in token/],
 ])("shows actionable %s guidance in the sign-in UI", async (kind, message) => {
  const { GoogleSignInButton } = require("../ui/GoogleSignInButton");
  if (kind === "services") {
    (GoogleSignin.hasPlayServices as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error("native"), { code: statusCodes.PLAY_SERVICES_NOT_AVAILABLE }));
  } else if (kind === "configuration") {
    signIn.mockRejectedValueOnce(Object.assign(new Error("DEVELOPER_ERROR"), { code: "10" }));
  } else {
    signIn.mockResolvedValueOnce({ type: "success", data: { idToken: null } });
  }
  render(<GoogleSignInButton />);
  fireEvent.press(screen.getByText("Continue with Google"));
  await waitFor(() => expect(screen.getByText(message)).toBeTruthy());
 });
