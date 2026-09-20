import "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => "mock-access-token"),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));

// Reanimated / worklets need their native runtime; component tests use the library's own mocks.
jest.mock("react-native-worklets", () => require("react-native-worklets/lib/module/mock"));
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

// lucide ships ESM-only `.mjs`; icons are irrelevant to behaviour, so every icon renders nothing.
jest.mock("lucide-react-native", () => new Proxy({ __esModule: true }, { get: (target, key) => (key in target ? (target as never)[key] : () => null) }));

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return { ...require("react-native-safe-area-context/jest/mock").default, SafeAreaView: View };
});

// FlashList measures its container natively (and its own jestSetup targets a different version), so a
// plain FlatList stands in: same props for what the screen uses (data, renderItem, header/footer, paging).
jest.mock("@shopify/flash-list", () => ({ FlashList: require("react-native").FlatList }));
