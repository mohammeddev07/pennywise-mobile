import { QueryClient } from "@tanstack/react-query";

/**
 * One app-wide client. It is a module singleton (not created inside a component)
 * so logout code outside React can cancel in-flight requests and drop every cached
 * row that belongs to the previous account.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    // networkMode "always": on web react-query otherwise PAUSES a fetch while navigator.onLine is false, which
    // left Activity on "updating..." forever with no error and no Retry. Native has no such flag and fails
    // fast; this makes web behave the same (the request is attempted, fails, and the error state shows).
    queries: { retry: 0, staleTime: 10_000, networkMode: "always" },
  },
});

export async function clearQueryCache() {
  await queryClient.cancelQueries();
  queryClient.clear();
}
