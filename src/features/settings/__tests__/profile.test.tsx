import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import ProfileScreen from "@/app/(tabs)/settings";
import { useAuthStore } from "@/features/auth/store";
import { normalizeBook, useBooksStore } from "@/features/books/store";
import { useSettingsStore } from "../store";

const mockRouter = { push: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));
jest.mock("@/features/auth/google", () => ({ googleSignInAvailable: false }));

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ user: { id: "profile-user", email: "person@example.com", defaultCurrencyCode: "USD", createdAt: "" } });
  useBooksStore.setState({
    ready: true,
    selectedBookId: "profile-book",
    books: [normalizeBook({ id: "profile-book", name: "Personal", currencyCode: "USD", timezone: "America/Chicago", balanceMinor: 12345 })],
    isManaging: false,
  });
  useSettingsStore.setState({ displayName: "Alex", appearance: "dark" });
});

it("groups account controls, book management, data tools and help while preserving navigation", async () => {
  render(<ProfileScreen />);
  await screen.findByRole("header", { name: "Account & preferences" });
  expect(screen.getAllByText("Alex")).toHaveLength(2);
  expect(screen.getByText("person@example.com")).toBeTruthy();
  for (const title of ["Cash books", "Your data", "Help & app"]) {
    expect(screen.getByRole("header", { name: title })).toBeTruthy();
  }
  expect(screen.queryByText("SYNCED")).toBeNull();
  expect(screen.queryByText("Opening balance")).toBeNull();
  expect(screen.getByText("mohammed.dev07@gmail.com", { normalizer: text => text.replace(/\u200b/g, "") })).toBeTruthy();

  fireEvent.press(screen.getByText("Categories & budgets"));
  expect(mockRouter.push).toHaveBeenLastCalledWith("/(tabs)/categories");
  fireEvent.press(screen.getByText("Import transactions"));
  expect(mockRouter.push).toHaveBeenLastCalledWith("/modals/import-transactions");
  fireEvent.press(screen.getByText("Contact support"));
  expect(mockRouter.push).toHaveBeenLastCalledWith("/modals/contact-support");
  fireEvent.press(screen.getByText("Display name"));
  expect(screen.getByRole("header", { name: "Display name" })).toBeTruthy();
});

it("keeps contact support and update checks reachable when no books are loaded", async () => {
  useBooksStore.setState({ books: [], ready: false });
  render(<ProfileScreen />);
  await screen.findByRole("header", { name: "Help & app" });
  fireEvent.press(screen.getByText("Contact support"));
  expect(mockRouter.push).toHaveBeenCalledWith("/modals/contact-support");
  expect(screen.getByText("Check for updates")).toBeTruthy();
});
