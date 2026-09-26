import { apiClient } from "@/shared/api/client";
import type { FilterProposalRequest, FilterProposalResponse } from "@/shared/types/aiFilter";

/**
 * "Describe your filter": one Gemini call per request, no proposal de-duplication yet, so a
 * generic cold-start retry could silently double-spend the AI daily quota on a slow backend wake-up.
 * `_retriedForColdStart: true` opts this call out of that ladder (see shared/api/client.ts) - a
 * timeout here just fails, same as any other request would without the retry.
 */
export async function proposeFilter(
  bookId: string,
  text: string,
  signal?: AbortSignal
): Promise<FilterProposalResponse> {
  const body: FilterProposalRequest = { text };
  const { data } = await apiClient.post<FilterProposalResponse>(
    `/v1/books/${bookId}/filter-proposals`,
    body,
    { signal, _retriedForColdStart: true }
  );
  return data;
}
