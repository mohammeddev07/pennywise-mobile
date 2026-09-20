/** Component + logic tests. Runs the real mock API (EXPO_PUBLIC_MOCK_API) instead of hand-rolled fakes. */
module.exports = {
  preset: "jest-expo",
  // React Query / zustand-persist leave idle timers behind in hook tests; without this a single-file run never exits.
  forceExit: true,
  globalSetup: "<rootDir>/jest.global-setup.js",
  setupFiles: ["<rootDir>/jest.env.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.(ts|tsx)"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@shopify/flash-list|nativewind|react-native-css-interop|lucide-react-native|react-native-svg|react-native-reanimated|react-native-worklets|zustand))",
  ],
};
