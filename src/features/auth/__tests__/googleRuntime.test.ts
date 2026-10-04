import { Platform, TurboModuleRegistry } from "react-native";
import Constants from "expo-constants";

const mockNativeLoad = jest.fn();
jest.mock("@react-native-google-signin/google-signin", () => {
  mockNativeLoad();
  throw new Error("Native module must not load");
});

it.each([
  ["web", "bare", true],
  ["ios", "bare", true],
  ["android", "storeClient", true],
  ["android", "bare", false],
])("does not initialize Google on %s / %s / module=%s", async (os, environment, present) => {
  const platform = jest.replaceProperty(Platform, "OS", os as typeof Platform.OS);
  const execution = jest.replaceProperty(Constants, "executionEnvironment", environment as typeof Constants.executionEnvironment);
  const native = jest.spyOn(TurboModuleRegistry, "get").mockReturnValue(present ? {} : null);
  mockNativeLoad.mockClear();
  try {
    await jest.isolateModulesAsync(async () => {
      const google = require("../google") as typeof import("../google");
      expect(google.googleSignInAvailable).toBe(false);
      await google.signOutOfGoogle();
      await expect(google.getGoogleIdToken()).rejects.toThrow(/isn't configured/);
      expect(google.getGoogleSignInErrorMessage(new Error("internal detail"))).toBe("Something went wrong. Please try again.");
    });
    expect(mockNativeLoad).not.toHaveBeenCalled();
  } finally {
    platform.restore();
    execution.restore();
    native.mockRestore();
  }
});
