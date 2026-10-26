import { useEffect } from "react";
import * as Updates from "expo-updates";
import { create } from "zustand";

export type AppUpdateStatus = "idle" | "checking" | "downloading" | "available" | "restarting" | "up-to-date" | "unavailable" | "error";

type State = {
  status: AppUpdateStatus;
  error: string | null;
  checkAndDownload: () => Promise<void>;
  applyUpdate: () => Promise<void>;
};

// Startup, Settings and the restart banner all operate on the same native updater.
// Keep their state together so they cannot run competing checks or lose a ready update.
export const useAppUpdateStore = create<State>((set, get) => ({
  status: "idle",
  error: null,
  checkAndDownload: async () => {
    const { status } = get();
    if (["checking", "downloading", "available", "restarting"].includes(status)) return;
    if (!Updates.isEnabled) {
      set({ status: "unavailable", error: null });
      return;
    }
    set({ status: "checking", error: null });
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable && !result.isRollBackToEmbedded) {
        set({ status: "up-to-date" });
        return;
      }
      set({ status: "downloading" });
      const download = await Updates.fetchUpdateAsync();
      if (!download.isNew && !download.isRollBackToEmbedded) {
        throw new Error("The update could not be downloaded. Please try again.");
      }
      set({ status: "available", error: null });
    } catch (err) {
      // Only ever surfaced as a generic "Couldn't check right now" in the UI otherwise -
      // logging the real message is the only way to tell a stale/misconfigured channel
      // apart from a network error apart from an actual expo-updates bug.
      console.error("[useAppUpdates] check/fetch failed:", err);
      set({ status: "error", error: err instanceof Error ? err.message : "Couldn't check for updates." });
    }
  },
  applyUpdate: async () => {
    if (get().status !== "available") return;
    set({ status: "restarting", error: null });
    try {
      await Updates.reloadAsync();
    } catch (err) {
      console.error("[useAppUpdates] restart failed:", err);
      // The downloaded update is still ready. Let either restart button retry.
      set({ status: "available", error: "Couldn't restart to apply the update. Please try again." });
    }
  },
}));

/** OTA updates cover compatible JS/assets; native changes still require a new build. */
export function useAppUpdates() {
  const state = useAppUpdateStore();
  const { isUpdatePending } = Updates.useUpdates();

  useEffect(() => {
    // Also recognize updates downloaded by the native updater before this screen mounted.
    const { status } = useAppUpdateStore.getState();
    if (Updates.isEnabled && isUpdatePending && !["checking", "downloading", "restarting"].includes(status)) {
      useAppUpdateStore.setState({ status: "available", error: null });
    }
  }, [isUpdatePending]);

  return state;
}
