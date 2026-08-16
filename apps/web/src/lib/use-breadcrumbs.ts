import { useMatches } from "@tanstack/react-router";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** Names a crumb the route only knows at runtime, like a record's title. */
    crumb?: (params: Record<string, string>) => string;
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
  const matches = useMatches();
  const crumbs: Crumb[] = [];

  for (const match of matches) {
    const { crumb, title } = match.staticData ?? {};
    const label = crumb ? crumb(match.params as Record<string, string>) : title;
    if (label && crumbs.at(-1)?.label !== label) {
      crumbs.push({ label, href: match.pathname });
    }
  }

  return crumbs;
}
