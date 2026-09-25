import { Linking } from "react-native";

export const SUPPORT_EMAIL = "cntc.mak@gmail.com";
const SUPPORT_SUBJECT = "Pennywise Support";

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_SUBJECT)}`;

/**
 * Opens the device's mail composer, addressed to support with the subject filled in.
 * Resolves `false` when nothing on the device could handle it, so the caller can show
 * the address instead of failing silently.
 *
 * Deliberately not gated on `Linking.canOpenURL`: on Android 11+ it answers `false` for
 * `mailto:` unless the manifest declares a matching `<queries>` intent, and on iOS it
 * needs `LSApplicationQueriesSchemes` - so it would send people with a working mail app
 * to the fallback. `openURL` itself rejects when no app takes the URL.
 */
export async function openSupportEmail(): Promise<boolean> {
  try {
    await Linking.openURL(SUPPORT_MAILTO);
    return true;
  } catch {
    return false;
  }
}
