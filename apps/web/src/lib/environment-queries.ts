import { queryOptions } from "@tanstack/react-query";
import { environmentClient } from "@/lib/environment-client";

export const environmentKeys = {
  all: ["environment"] as const,
  chatGpt: (attemptId: string) =>
    [...environmentKeys.all, "chatgpt", attemptId] as const,
  subscriptions: () => [...environmentKeys.all, "subscriptions"] as const,
  variables: () => [...environmentKeys.all, "variables"] as const,
};

export const environmentQueries = {
  subscriptions: () =>
    queryOptions({
      queryFn: environmentClient.subscriptions,
      queryKey: environmentKeys.subscriptions(),
    }),
  variables: () =>
    queryOptions({
      queryFn: environmentClient.variables,
      queryKey: environmentKeys.variables(),
    }),
};
