import { queryOptions } from "@tanstack/react-query";
import { codebaseClient } from "@/lib/codebase-client";

export const codebaseKeys = {
  account: ["codebase", "account"] as const,
  /** Everything under codebase, for the one place that invalidates the lot. */
  all: () => ["codebase"] as const,
  repositories: ["codebase", "repositories"] as const,
};

export const codebaseQueries = {
  account: () =>
    queryOptions({
      queryFn: codebaseClient.account,
      queryKey: codebaseKeys.account,
    }),
  /* Only once an account exists: without one the list is empty by
     definition, and asking for it costs a round trip to learn that. */
  repositories: (connected: boolean) =>
    queryOptions({
      enabled: connected,
      queryFn: codebaseClient.repositories,
      queryKey: codebaseKeys.repositories,
    }),
};
