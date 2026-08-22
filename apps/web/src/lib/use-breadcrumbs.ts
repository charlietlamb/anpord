import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useMatches } from "@tanstack/react-router";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** Names a crumb the route only knows at runtime.
     *
     * Takes the query client as well as the params, because the useful name
     * for a record is in the record: a cell is known by its case, and the id
     * in the path is a hash nobody reads. Returns undefined to fall back to a
     * generic label while the data is still loading. */
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

/**
 * Reads the label each matched route declares, so a section that renders an
 * Outlet contributes its own crumb and the leaf keeps naming only itself.
 */
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
