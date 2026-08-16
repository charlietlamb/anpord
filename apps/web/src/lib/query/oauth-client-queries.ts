import { queryOptions } from "@tanstack/react-query";

const HOUR = 60 * 60 * 1000;

const oauthClientKeys = {
  all: ["oauth-clients"] as const,
  detail: (clientId: string) => [...oauthClientKeys.all, clientId] as const,
} as const;

async function fetchClientName(clientId: string) {
  const response = await fetch(
    `/api/oauth/clients/${encodeURIComponent(clientId)}`
  );
  if (!response.ok) {
    return null;
  }
  const client = (await response.json()) as { name?: string };
  return client.name ?? null;
}

export const oauthClientQueries = {
  name: (clientId: string | undefined) =>
    queryOptions({
      queryKey: oauthClientKeys.detail(clientId ?? ""),
      queryFn: () => fetchClientName(clientId ?? ""),
      enabled: Boolean(clientId),
      staleTime: HOUR,
    }),
} as const;
