import { Platform, TurboModuleRegistry } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { getAuthErrorMessage } from "@/shared/api/errors";

class GoogleSignInError extends Error {}

export function getGoogleSignInErrorMessage(error: unknown) {
  return error instanceof GoogleSignInError ? error.message : getAuthErrorMessage(error);
}

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const validWebClientId = /^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(webClientId ?? "");

/**
 * Android only for now: iOS also needs its own client ID plus the library's
 * config plugin (URL scheme) in app.json, and web has no native module.
 */
export const googleSignInAvailable = Platform.OS === "android" &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  validWebClientId && TurboModuleRegistry.get("RNGoogleSignin") != null;

let configured = false;

/**
 * Opens Google's account picker and returns an ID token for the backend, or
 * null when the user backs out. The token's audience is the *web* client ID -
 * the one the backend lists in GOOGLE_CLIENT_IDS.
 */
export async function getGoogleIdToken(): Promise<string | null> {
  if (!googleSignInAvailable) throw new GoogleSignInError("Google sign-in isn't configured for this build.");
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } =
    require("@react-native-google-signin/google-signin") as typeof import("@react-native-google-signin/google-signin");
  if (!configured) {
    GoogleSignin.configure({ webClientId });
    configured = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return null;
    if (!res.data.idToken) throw new GoogleSignInError("Google didn't return a sign-in token. Try again.");
    return res.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) return null;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
        throw new GoogleSignInError("Google Play services is unavailable on this device.");
      // Android's answer to a package name / SHA-1 that no OAuth client in Google Cloud matches.
      if (String(error.code) === "10" || /DEVELOPER_ERROR/.test(error.message))
        throw new GoogleSignInError("Google sign-in isn't set up for this build (check the Android client's SHA-1).");
    }
    throw error;
  }
}

/** Forget the picked account so the next sign-in asks again. Best effort. */
export async function signOutOfGoogle() {
  if (!googleSignInAvailable) return;
  try {
    const { GoogleSignin } = require("@react-native-google-signin/google-signin") as typeof import("@react-native-google-signin/google-signin");
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google, or the module is unavailable - nothing to clear.
  }
}
