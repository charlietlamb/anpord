import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useMatches } from "@tanstack/react-router";

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

export function useBreadcrumbs(): Crumb[] {
  const queryClient = useQueryClient();
  const matches = useMatches();
  const crumbs: Crumb[] = [];

  for (const match of matches) {
    const { crumb, title } = match.staticData ?? {};
    const label =
      (crumb
        ? crumb(match.params as Record<string, string>, queryClient)
        : undefined) ?? title;

    if (label && crumbs.at(-1)?.label !== label) {
      crumbs.push({ label, href: match.pathname });
    }
  }

  return crumbs;
}
