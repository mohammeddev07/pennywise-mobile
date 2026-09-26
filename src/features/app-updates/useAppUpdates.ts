import { useCallback, useState } from "react";
import * as Updates from "expo-updates";

export type AppUpdateStatus = "idle" | "checking" | "downloading" | "available" | "up-to-date" | "error";

/**
 * expo-updates only covers JS/asset changes shipped via `eas update` - a
 * native change (new native module, SDK bump, new permission) still needs a
 * fresh build from expo.dev regardless of this. Updates.isEnabled is false
 * in Expo Go and in any build without a configured update channel (e.g. a
 * local dev build), so this is a deliberate no-op there rather than a crash.
 */
export function useAppUpdates() {
  const [status, setStatus] = useState<AppUpdateStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const checkAndDownload = useCallback(async () => {
    if (!Updates.isEnabled) {
      setStatus("up-to-date");
      return;
    }
    setStatus("checking");
    setError(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setStatus("up-to-date");
        return;
      }
      setStatus("downloading");
      await Updates.fetchUpdateAsync();
      setStatus("available");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Couldn't check for updates.");
    }
  }, []);

  const applyUpdate = useCallback(() => {
    Updates.reloadAsync();
  }, []);

  return { status, error, checkAndDownload, applyUpdate };
}
