import { QueryClient } from "@tanstack/react-query";
import { HttpError } from "@/lib/api-client";

const MINUTE = 60 * 1000;
const RETRIES = 2;

const retryable = (failureCount: number, error: unknown) =>
  !(error instanceof HttpError && error.status < 500) && failureCount < RETRIES;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: MINUTE,
        gcTime: 5 * MINUTE,
        retry: retryable,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
