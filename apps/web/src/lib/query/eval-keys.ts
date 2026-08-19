/**
 * Keys are per run, so a run that finishes refetches its own detail rather
 * than every run on the page. `detail` sits under `all` so invalidating the
 * list after a start also picks up the new run.
 */
export const evalKeys = {
  all: ["evals"] as const,
  detail: (id: string) => [...evalKeys.details(), id] as const,
  details: () => [...evalKeys.all, "detail"] as const,
  list: () => [...evalKeys.all, "list"] as const,
} as const;
