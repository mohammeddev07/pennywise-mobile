import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import ContactSupportModal from "../contact-support";
import { sendSupportMessage } from "@/shared/api/support";

jest.mock("@/shared/api/support", () => ({ sendSupportMessage: jest.fn() }));

const send = sendSupportMessage as jest.MockedFunction<typeof sendSupportMessage>;

beforeEach(() => send.mockReset());

it("requires both fields and sends trimmed content", async () => {
  send.mockResolvedValue(undefined);
  render(<ContactSupportModal />);
  fireEvent.press(screen.getByText("Send message"));
  expect(send).not.toHaveBeenCalled();

  fireEvent.changeText(screen.getByLabelText("Subject"), "  Help  ");
  fireEvent.changeText(screen.getByLabelText("Message"), "  My question  ");
  fireEvent.press(screen.getByText("Send message"));

  await waitFor(() => expect(send).toHaveBeenCalledWith("Help", "My question", expect.any(String)));
  expect(screen.getByText("Message sent")).toBeTruthy();
});

it("keeps the draft and idempotency key after a failed send", async () => {
  send.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(undefined);
  render(<ContactSupportModal />);
  fireEvent.changeText(screen.getByLabelText("Subject"), "Question");
  fireEvent.changeText(screen.getByLabelText("Message"), "Please help");
  fireEvent.press(screen.getByText("Send message"));

  await waitFor(() => expect(screen.getByText("Couldn't send your message. Please try again.")).toBeTruthy());
  expect(screen.getByLabelText("Subject").props.value).toBe("Question");
  expect(screen.getByLabelText("Message").props.value).toBe("Please help");
  const firstKey = send.mock.calls[0][2];

  fireEvent.press(screen.getByText("Send message"));
  await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  expect(send.mock.calls[1][2]).toBe(firstKey);
});
