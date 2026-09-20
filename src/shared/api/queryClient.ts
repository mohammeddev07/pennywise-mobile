import { QueryClient } from "@tanstack/react-query";

/**
 * One app-wide client. It is a module singleton (not created inside a component)
 * so logout code outside React can cancel in-flight requests and drop every cached
 * row that belongs to the previous account.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 0, staleTime: 10_000 },
  },
});

export async function clearQueryCache() {
  await queryClient.cancelQueries();
  queryClient.clear();
}
