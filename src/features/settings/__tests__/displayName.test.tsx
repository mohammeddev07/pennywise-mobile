import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { DisplayNameSetting } from "../ui/DisplayNameSetting";
import { useAuthStore } from "@/features/auth/store";

beforeEach(() => {
  useAuthStore.setState({
    user: { id: "u1", email: "sam@example.com", displayName: null, defaultCurrencyCode: "USD", createdAt: "" },
  });
});

it("saves the name to the account and clears it when blank", async () => {
  render(<DisplayNameSetting />);
  fireEvent.press(screen.getByText("Add your name"));
  fireEvent.changeText(screen.getByLabelText("Display name"), "  Sam ");
  fireEvent.press(screen.getByText("Save"));
  await waitFor(() => expect(useAuthStore.getState().user?.displayName).toBe("Sam"));

  fireEvent.press(screen.getByText("Sam"));
  fireEvent.changeText(screen.getByLabelText("Display name"), "   ");
  fireEvent.press(screen.getByText("Save"));
  await waitFor(() => expect(useAuthStore.getState().user?.displayName).toBeNull());
});
