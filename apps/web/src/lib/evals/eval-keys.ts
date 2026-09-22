import type { EvalHarness } from "@anpord/schema/domain/evals";
export const evalKeys = {
  all: ["evals"] as const,
  lists: () => [...evalKeys.all, "list"] as const,
  list: (cursor: { readonly id: string } | null) =>
    [...evalKeys.lists(), cursor?.id ?? "first"] as const,
  details: () => [...evalKeys.all, "detail"] as const,
  detail: (id: string) => [...evalKeys.details(), id] as const,
  models: (harness: EvalHarness, query: string) =>
    [...evalKeys.all, "models", harness, query] as const,
  playground: (id: string) => [...evalKeys.all, "playground", id] as const,
  playgrounds: () => [...evalKeys.all, "playground"] as const,

  tail: (id: string) => [...evalKeys.all, "tail", id] as const,

  subscription: (id: string) => [...evalKeys.all, "subscription", id] as const,

  cases: (tag: string | null) =>
    [...evalKeys.all, "cases", tag ?? "all"] as const,

  case: (id: string) => [...evalKeys.all, "case", id] as const,

  history: (cellKey: string) =>
    [...evalKeys.all, "cell", cellKey, "history"] as const,
} as const;
