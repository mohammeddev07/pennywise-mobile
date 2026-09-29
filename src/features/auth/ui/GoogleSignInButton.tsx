import { useState } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Button } from "@/shared/ui/components/Button";
import { AppText } from "@/shared/ui/components/AppText";
import { getAuthErrorMessage } from "@/shared/api/errors";
import { getGoogleIdToken, googleSignInAvailable } from "../google";
import { useAuthStore } from "../store";
import { enterApp } from "../enterApp";

/** Google's four-color "G", as its branding guidelines require on the button. */
export function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

/**
 * "Continue with Google" for both login and signup - the backend creates the
 * account on first use. Renders nothing where Google sign-in isn't configured.
 */
export function GoogleSignInButton({ disabled }: { disabled?: boolean }) {
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const [busy, setBusy] = useState(false);
  const [coldStartWait, setColdStartWait] = useState(false);
  const [error, setError] = useState("");
  if (!googleSignInAvailable) return null;

  const onPress = async () => {
    setError("");
    setBusy(true);
    // Same cold-start honesty as the email form: Render can take ~60s to wake.
    const timer = setTimeout(() => setColdStartWait(true), 12_000);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return;
      await loginWithGoogle(idToken);
      await enterApp();
    } catch (failure) {
      setError(getAuthErrorMessage(failure));
    } finally {
      clearTimeout(timer);
      setColdStartWait(false);
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <Button
        label="Continue with Google"
        variant="secondary"
        loading={busy}
        disabled={disabled}
        leftIcon={<GoogleLogo />}
        onPress={() => void onPress()}
      />
      {error ? (
        <AppText variant="sm" tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      {coldStartWait ? (
        <AppText variant="sm" tone="muted">
          Waking up the server, this can take up to a minute...
        </AppText>
      ) : null}
    </View>
  );
}
