import { useState } from "react";
import { SettingsRow } from "@/shared/ui/components/SettingsRow";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { linkGoogle } from "@/shared/api/auth";
import { getGoogleIdToken, googleSignInAvailable, getGoogleSignInErrorMessage } from "../google";
import { useAuthStore } from "../store";

/**
 * Lets an email/password account also log in with Google. The backend never
 * merges by email on its own (GOOGLE_ACCOUNT_LINK_REQUIRED), so this is the
 * only way an existing account gains Google sign-in. Linking is idempotent.
 */
export function ConnectGoogleRow() {
  const setUser = useAuthStore((s) => s.setUser);
  const [status, setStatus] = useState<"idle" | "busy" | "done">("idle");
  if (!googleSignInAvailable) return null;

  const connect = async () => {
    setStatus("busy");
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return setStatus("idle");
      setUser(await linkGoogle(idToken));
      setStatus("done");
    } catch (error) {
      setStatus("idle");
      useUndoToastStore.getState().showError(error, getGoogleSignInErrorMessage(error));
    }
  };

  return (
    <SettingsRow
      icon="shield-checkmark"
      label="Connect Google"
      value={status === "busy" ? "Connecting..." : status === "done" ? "Connected" : "Also log in with Google"}
      onPress={status === "idle" ? () => void connect() : undefined}
    />
  );
}
