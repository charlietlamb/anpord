import { queryOptions } from "@tanstack/react-query";
import { codebaseClient } from "@/lib/codebase-client";

export const codebaseKeys = {
  account: ["codebase", "account"] as const,
  all: () => ["codebase"] as const,
  repositories: ["codebase", "repositories"] as const,
};

export const codebaseQueries = {
  account: () =>
    queryOptions({
      queryFn: codebaseClient.account,
      queryKey: codebaseKeys.account,
    }),
  repositories: (connected: boolean) =>
    queryOptions({
      enabled: connected,
      queryFn: codebaseClient.repositories,
      queryKey: codebaseKeys.repositories,
    }),
};
