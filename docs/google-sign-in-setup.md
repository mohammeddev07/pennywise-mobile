# Google sign-in release setup

The Android client uses `@react-native-google-signin/google-signin`. It sends a Google ID token to `POST /v1/auth/google`, then stores the returned Pennywise access token through the same SecureStore path as password login. Existing password accounts must log in first and use **Profile → Connect Google**; the backend will not merge accounts by email.

## Google Cloud and EAS

- Create an OAuth **Web** client. Set its ID as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in each EAS environment that will build this feature, and include the same ID in Render's `GOOGLE_CLIENT_IDS`.
- Register an OAuth **Android** client for package `com.mohammeddev07.pennywise` and the EAS signing certificate SHA-1 below. The Android client ID is not passed as `webClientId` in the app.
- On 2026-09-29, both preview and production EAS profiles used SHA-1 `0F:07:8C:1B:91:1C:9A:26:BD:8B:6C:7D:77:41:03:28:12:56:3D:89` and SHA-256 `85:CC:67:38:51:EB:E9:54:9A:C5:16:9E:22:79:4C:D3:A7:F3:FE:26:39:97:49:B2:BE:DC:C4:19:05:6A:6E:43`. Recheck `eas credentials -p android` if the keystore changes.
- `npm run release:check` now rejects a missing or malformed Web client ID. On 2026-09-29 the check passed for EAS `preview`; EAS `production` lacked both `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_API_BASE_URL`.

The package's Expo config plugin without Firebase only writes an iOS URL scheme and requires the iOS OAuth client's reversed ID. Android signs in through the autolinked native module with an explicit Web client ID; no Android plugin setting is available. Add the package plugin with `iosUrlScheme` when an iOS OAuth client and iOS support are introduced. Do not add the plugin without options: that selects the package's Firebase setup and requires Firebase configuration files.

## Build and update compatibility

This change adds a native module and raises the Expo app version to `1.1.0`, which is the EAS Update runtime version under the `appVersion` policy. Build and install a fresh preview APK before testing Google sign-in. An OTA update cannot put the native module into a previously installed APK, and a `1.1.0` update will not target an older `1.0.0` runtime. Later JavaScript-only fixes for this `1.1.0` binary can use OTA with both `--channel preview` and `--environment preview`, after the preview channel is linked to the intended EAS Update branch.

When push notifications are added later, their native module, config plugin, and Android FCM setup will require another fresh APK. Keep that as a separate build checkpoint.
