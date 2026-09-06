import { QueryClient } from "@tanstack/react-query";

const MINUTE = 60 * 1000;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: MINUTE,
        gcTime: 5 * MINUTE,
        retry: (failureCount, error) =>
          isUnauthorized(error) ? false : failureCount < 2,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/* A 401 means the session is gone, and retrying cannot produce one. */
function isUnauthorized(error: unknown) {
  return error instanceof Error && error.message.includes("(401)");
}
