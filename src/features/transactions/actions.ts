import * as transactionsApi from "@/shared/api/transactions";
import { queryClient } from "@/shared/api/queryClient";
import type { TransactionCreatePayload, TransactionUpdatePayload } from "@/shared/types/api";
import { getAccountEpoch, isCurrentAccountEpoch } from "@/shared/session/accountEpoch";
import { useAuthStore } from "@/features/auth/store";
import { invalidateTransactionData, txKeys } from "./queries";
import { buildDuplicatePayload, mapTransactionResponse, randomIdempotencyKey, type Transaction } from "./model";

/**
 * Every write goes straight to the server and then through
 * `invalidateTransactionData`. There is no local copy to patch, so a failed write
 * leaves nothing half-applied and a delete can never be "undone" by re-inserting a
 * row the server no longer has. `null` means the account changed while the request
 * was in flight and the result was discarded.
 */

type Ref = Pick<Transaction, "id" | "bookId" | "version">;

const accountId = () => useAuthStore.getState().user?.id ?? "";

export async function createTransaction(
  bookId: string,
  idempotencyKey: string,
  payload: TransactionCreatePayload
): Promise<Transaction | null> {
  const epoch = getAccountEpoch();
  const created = mapTransactionResponse(await transactionsApi.createTransaction(bookId, idempotencyKey, payload));
  if (!isCurrentAccountEpoch(epoch)) return null;
  await invalidateTransactionData(queryClient, bookId, { months: [created.occurredOn] });
  return created;
}

/** PATCH with `If-Match` = the version the user was looking at. A stale version rejects with 412; nothing is retried. */
export async function updateTransaction(
  tx: Ref,
  patch: TransactionUpdatePayload,
  previousOccurredOn?: string
): Promise<Transaction | null> {
  const epoch = getAccountEpoch();
  const updated = mapTransactionResponse(await transactionsApi.patchTransaction(tx.bookId, tx.id, tx.version, patch));
  if (!isCurrentAccountEpoch(epoch)) return null;
  // Seed the detail cache with the server's answer so the details screen never flashes the old row.
  queryClient.setQueryData(txKeys.detail({ accountId: accountId(), bookId: tx.bookId }, tx.id), updated);
  await invalidateTransactionData(queryClient, tx.bookId, { months: [previousOccurredOn, updated.occurredOn] });
  return updated;
}

export async function deleteTransaction(tx: Ref & Pick<Transaction, "occurredOn">): Promise<boolean> {
  const epoch = getAccountEpoch();
  await transactionsApi.deleteTransaction(tx.bookId, tx.id, tx.version);
  if (!isCurrentAccountEpoch(epoch)) return false;
  queryClient.removeQueries({ queryKey: txKeys.detail({ accountId: accountId(), bookId: tx.bookId }, tx.id) });
  await invalidateTransactionData(queryClient, tx.bookId, { months: [tx.occurredOn] });
  return true;
}

/** Duplicate = a real create with a fresh idempotency key; see `DUPLICATE_DATE_POLICY`. */
export async function duplicateTransaction(tx: Transaction, now: Date = new Date()): Promise<Transaction | null> {
  return createTransaction(tx.bookId, randomIdempotencyKey(), buildDuplicatePayload(tx, now));
}
