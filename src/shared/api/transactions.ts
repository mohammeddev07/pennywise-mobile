import { apiClient } from "@/shared/api/client";
import type {
  TransactionCreatePayload,
  TransactionListParams,
  TransactionListResponse,
  TransactionResponse,
  TransactionUpdatePayload,
} from "@/shared/types/api";

export async function listTransactions(
  bookId: string,
  params?: TransactionListParams
): Promise<TransactionListResponse> {
  const { data } = await apiClient.get<TransactionListResponse>(`/v1/books/${bookId}/transactions`, { params });
  return data;
}

export async function createTransaction(
  bookId: string,
  idempotencyKey: string,
  payload: TransactionCreatePayload
): Promise<TransactionResponse> {
  const { data } = await apiClient.post<TransactionResponse>(`/v1/books/${bookId}/transactions`, payload, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return data;
}

export async function patchTransaction(
  bookId: string,
  txId: string,
  version: number,
  patch: TransactionUpdatePayload
): Promise<TransactionResponse> {
  const { data } = await apiClient.patch<TransactionResponse>(
    `/v1/books/${bookId}/transactions/${txId}`,
    patch,
    { headers: { "If-Match": `"${version}"` } }
  );
  return data;
}

export async function deleteTransaction(bookId: string, txId: string, version: number): Promise<void> {
  await apiClient.delete(`/v1/books/${bookId}/transactions/${txId}`, {
    headers: { "If-Match": `"${version}"` },
  });
}
