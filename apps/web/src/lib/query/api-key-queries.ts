import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export const apiKeyKeys = {
  all: ["api-keys"] as const,
  lists: () => [...apiKeyKeys.all, "list"] as const,
  list: (organizationId: string) =>
    [...apiKeyKeys.lists(), organizationId] as const,
} as const;

export const apiKeyQueries = {
  list: (organizationId: string) =>
    queryOptions({
      queryKey: apiKeyKeys.list(organizationId),
      enabled: organizationId !== "",
      queryFn: async () => {
        const { data, error } = await authClient.apiKey.list({
          query: { organizationId },
        });
        if (error) {
          throw new Error(error.message ?? "Couldn't load your API keys");
        }
        return Array.isArray(data) ? data : (data?.apiKeys ?? []);
      },
    }),
} as const;
