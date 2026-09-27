import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useMatches } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    crumb?: (
      params: Record<string, string>,
      queryClient: QueryClient
    ) => string | undefined;
    title?: string;
  }
}

export interface Crumb {
  href: string;
  label: string;
}

type Match = ReturnType<typeof useMatches>[number];

const labelOf = (match: Match, queryClient: QueryClient) => {
  const { crumb, title } = match.staticData ?? {};
  return (
    (crumb
      ? crumb(match.params as Record<string, string>, queryClient)
      : undefined) ??
    title ??
    ""
  );
};

export function useBreadcrumbs(): Crumb[] {
  const queryClient = useQueryClient();
  const matches = useMatches();
  const read = () =>
    JSON.stringify(matches.map((match) => labelOf(match, queryClient)));
  const labels: string[] = JSON.parse(
    useSyncExternalStore(
      (onChange) => queryClient.getQueryCache().subscribe(onChange),
      read,
      read
    )
  );
  const crumbs: Crumb[] = [];

  for (const [index, match] of matches.entries()) {
    const label = labels[index];

    if (label && crumbs.at(-1)?.label !== label) {
      crumbs.push({ label, href: match.pathname });
    }
  }

  return crumbs;
}
