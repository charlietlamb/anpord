/**
 * Route params arrive as raw strings, so keys accept `string` rather than a
 * branded id; decoding to the brand is the client's job, not the key's.
 */
export const evalKeys = {
  all: ["evals"] as const,
  lists: () => [...evalKeys.all, "list"] as const,
  details: () => [...evalKeys.all, "detail"] as const,
  detail: (id: string) => [...evalKeys.details(), id] as const,
  playground: (id: string) => [...evalKeys.all, "playground", id] as const,
  playgrounds: () => [...evalKeys.all, "playground"] as const,
  /** Keyed by the cell rather than the run: the same cell appears in every
   * run that ever produced it, and its history is the same list each time. */
  history: (cellKey: string) =>
    [...evalKeys.all, "cell", cellKey, "history"] as const,
} as const;
