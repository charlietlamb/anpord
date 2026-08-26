import { queryOptions } from "@tanstack/react-query";
import { codebaseClient } from "@/lib/codebase-client";

const keys = {
  account: ["codebase", "account"] as const,
  repositories: ["codebase", "repositories"] as const,
};

export const codebaseQueries = {
  account: () =>
    queryOptions({
      queryFn: codebaseClient.account,
      queryKey: keys.account,
    }),
  /* Only once an account exists: without one the list is empty by
     definition, and asking for it costs a round trip to learn that. */
  repositories: (connected: boolean) =>
    queryOptions({
      enabled: connected,
      queryFn: codebaseClient.repositories,
      queryKey: keys.repositories,
    }),
};
