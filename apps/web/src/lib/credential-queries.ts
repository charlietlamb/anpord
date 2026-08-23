import { queryOptions } from "@tanstack/react-query";
import { credentialsClient } from "@/lib/credentials-client";

export const credentialKeys = {
  all: ["credentials"] as const,
  connections: () => [...credentialKeys.all, "connections"] as const,
  integrations: () => [...credentialKeys.all, "integrations"] as const,
};

export const credentialQueries = {
  connections: () =>
    queryOptions({
      queryFn: credentialsClient.list,
      queryKey: credentialKeys.connections(),
    }),
  integrations: () =>
    queryOptions({
      queryFn: credentialsClient.integrations,
      queryKey: credentialKeys.integrations(),
    }),
};
