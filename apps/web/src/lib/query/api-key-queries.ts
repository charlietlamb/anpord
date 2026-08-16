import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export const apiKeyKeys = {
  all: ["api-keys"] as const,
  lists: () => [...apiKeyKeys.all, "list"] as const,
} as const;

export const apiKeyQueries = {
  list: () =>
    queryOptions({
      queryKey: apiKeyKeys.lists(),
      queryFn: async () => {
        const { data, error } = await authClient.apiKey.list();
        if (error) {
          throw new Error(error.message ?? "Couldn't load your API keys");
        }
        return Array.isArray(data) ? data : (data?.apiKeys ?? []);
      },
    }),
} as const;
