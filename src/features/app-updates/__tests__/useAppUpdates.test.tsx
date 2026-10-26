import React from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react-native";
import * as Updates from "expo-updates";

import { useAppUpdates, useAppUpdateStore } from "../useAppUpdates";
import { UpdateToast } from "@/shared/ui/components/UpdateToast";
import { useUpdateToastStore } from "@/shared/ui/state/useUpdateToastStore";

jest.mock("expo-updates", () => ({
  isEnabled: true,
  useUpdates: jest.fn(() => ({ isUpdatePending: false })),
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

const check = Updates.checkForUpdateAsync as jest.Mock;
const download = Updates.fetchUpdateAsync as jest.Mock;
const reload = Updates.reloadAsync as jest.Mock;
const nativeState = Updates.useUpdates as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useAppUpdateStore.setState({ status: "idle", error: null });
  useUpdateToastStore.setState({ visible: false });
  nativeState.mockReturnValue({ isUpdatePending: false });
  check.mockResolvedValue({ isAvailable: false, isRollBackToEmbedded: false });
  download.mockResolvedValue({ isNew: true, isRollBackToEmbedded: false });
  reload.mockResolvedValue(undefined);
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

it("reports unavailable updates honestly instead of claiming the app is up to date", async () => {
  jest.replaceProperty(Updates, "isEnabled", false);
  const { result } = renderHook(useAppUpdates);
  await act(() => result.current.checkAndDownload());
  expect(result.current.status).toBe("unavailable");
  expect(check).not.toHaveBeenCalled();
  expect(download).not.toHaveBeenCalled();
});

it("reports up to date only after a successful check finds no update", async () => {
  const { result } = renderHook(useAppUpdates);
  await act(() => result.current.checkAndDownload());
  expect(check).toHaveBeenCalledTimes(1);
  expect(download).not.toHaveBeenCalled();
  expect(result.current.status).toBe("up-to-date");
});

it("shares startup and Settings progress and prevents simultaneous checks", async () => {
  let finishCheck!: (value: { isAvailable: boolean }) => void;
  check.mockReturnValue(new Promise((resolve) => { finishCheck = resolve; }));
  const { result } = renderHook(() => ({ startup: useAppUpdates(), settings: useAppUpdates() }));
  let pending!: Promise<void>;
  act(() => { pending = result.current.startup.checkAndDownload(); });
  expect(result.current.settings.status).toBe("checking");
  await act(() => result.current.settings.checkAndDownload());
  expect(check).toHaveBeenCalledTimes(1);
  await act(async () => {
    finishCheck({ isAvailable: true });
    await pending;
  });
  expect(download).toHaveBeenCalledTimes(1);
  expect(result.current.settings.status).toBe("available");
  await act(() => result.current.settings.checkAndDownload());
  expect(result.current.startup.status).toBe("available");
  expect(check).toHaveBeenCalledTimes(1);
});

it("recognizes a previously downloaded update without requesting it again", async () => {
  nativeState.mockReturnValue({ isUpdatePending: true });
  const { result, unmount } = renderHook(useAppUpdates);
  expect(result.current.status).toBe("available");
  unmount();
  const settings = renderHook(useAppUpdates);
  expect(settings.result.current.status).toBe("available");
  await act(() => settings.result.current.checkAndDownload());
  expect(check).not.toHaveBeenCalled();
});

it("does not offer a restart when fetching returns no update", async () => {
  check.mockResolvedValue({ isAvailable: true });
  download.mockResolvedValue({ isNew: false, isRollBackToEmbedded: false });
  const { result } = renderHook(useAppUpdates);
  await act(() => result.current.checkAndDownload());
  expect(result.current.status).toBe("error");
  expect(result.current.error).toMatch(/could not be downloaded/);
  await act(() => result.current.applyUpdate());
  expect(reload).not.toHaveBeenCalled();
});

it("downloads and applies rollback directives", async () => {
  check.mockResolvedValue({ isAvailable: false, isRollBackToEmbedded: true });
  download.mockResolvedValue({ isNew: false, isRollBackToEmbedded: true });
  const { result } = renderHook(useAppUpdates);
  await act(() => result.current.checkAndDownload());
  expect(result.current.status).toBe("available");
  await act(() => result.current.applyUpdate());
  expect(reload).toHaveBeenCalledTimes(1);
});

it.each(["check", "download"])("recovers from a %s failure on retry", async (stage) => {
  check.mockResolvedValue({ isAvailable: true });
  (stage === "check" ? check : download).mockRejectedValueOnce(new Error("Network unavailable"));
  const { result } = renderHook(useAppUpdates);
  await act(() => result.current.checkAndDownload());
  expect(result.current.status).toBe("error");
  expect(result.current.error).toBe("Network unavailable");
  await act(() => result.current.checkAndDownload());
  expect(result.current.status).toBe("available");
  expect(result.current.error).toBeNull();
});

it("shows restart errors in the banner and lets the user retry once", async () => {
  useAppUpdateStore.setState({ status: "available" });
  useUpdateToastStore.getState().show();
  reload.mockRejectedValueOnce(new Error("No runtime reference"));
  render(<UpdateToast />);
  await act(async () => fireEvent.press(screen.getByRole("button", { name: "Restart to apply update" })));
  expect(screen.getByText(/Couldn't restart to apply the update/)).toBeTruthy();
  expect(screen.getByText("Retry")).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByRole("button", { name: "Restart to apply update" })));
  expect(reload).toHaveBeenCalledTimes(2);
  expect(screen.getByText("Restarting...")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Restart to apply update" }));
  expect(reload).toHaveBeenCalledTimes(2);
});
