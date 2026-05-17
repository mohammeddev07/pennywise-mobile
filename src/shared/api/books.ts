import { apiClient } from "@/shared/api/client";
import type { BookResponse } from "@/shared/types/api";

export async function listBooks(): Promise<{ items: BookResponse[] }> {
  const { data } = await apiClient.get<{ items: BookResponse[] }>("/v1/books");
  return data;
}

export async function createBook(
  name: string,
  currencyCode: string,
  timezone: string,
  openingBalanceMinor = 0
): Promise<BookResponse> {
  const { data } = await apiClient.post<BookResponse>("/v1/books", {
    name,
    currencyCode,
    timezone,
    openingBalanceMinor,
  });
  return data;
}

export async function patchBook(id: string, version: number, name: string): Promise<BookResponse> {
  const { data } = await apiClient.patch<BookResponse>(
    `/v1/books/${id}`,
    { name },
    { headers: { "If-Match": `"${version}"` } }
  );
  return data;
}

export async function deleteBook(id: string, version: number): Promise<void> {
  await apiClient.delete(`/v1/books/${id}`, { headers: { "If-Match": `"${version}"` } });
}
