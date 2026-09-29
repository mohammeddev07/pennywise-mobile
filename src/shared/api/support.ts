import { apiClient } from "@/shared/api/client";

export async function sendSupportMessage(subject: string, message: string, idempotencyKey: string) {
  await apiClient.post(
    "/v1/support/contact",
    { subject, message },
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
}
