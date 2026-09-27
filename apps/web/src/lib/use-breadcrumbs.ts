import { type QueryKey, useQueries } from "@tanstack/react-query";
import { useMatches } from "@tanstack/react-router";

export interface CrumbQuery {
  label: (data: unknown) => string | undefined;
  queryKey: QueryKey;
}

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    crumb?: (params: Record<string, string>) => string | CrumbQuery;
    title?: string;
  }
}

export interface Crumb {
  href: string;
  label: string;
}

export const crumbFrom = <TData>(
  queryKey: QueryKey,
  label: (data: TData) => string | undefined
): CrumbQuery => ({
  queryKey,
  label: (data) => label(data as TData),
});

export function useBreadcrumbs(): Crumb[] {
  const matches = useMatches();
  const sources = matches.map((match) =>
    match.staticData?.crumb?.(match.params as Record<string, string>)
  );
  const queried = sources.filter(
    (source): source is CrumbQuery => typeof source === "object"
  );
  const labels = useQueries({
    queries: queried.map((source) => ({
      queryKey: source.queryKey,
      enabled: false,
      select: source.label,
    })),
    combine: (results) => results.map((result) => result.data),
  });
  const crumbs: Crumb[] = [];

  for (const [index, match] of matches.entries()) {
    const source = sources[index];
    const label =
      (typeof source === "object" ? labels[queried.indexOf(source)] : source) ??
      match.staticData?.title;

    if (label && crumbs.at(-1)?.label !== label) {
      crumbs.push({ label, href: match.pathname });
    }
  }

  return crumbs;
}
