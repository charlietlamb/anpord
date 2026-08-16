import type { PromptListFilters } from "@/lib/query/prompt-list-filters";

/**
 * Route params arrive as raw strings, so keys accept `string` rather than the
 * branded `PromptId`; decoding to the brand is the client's job, not the key's.
 */
export const promptKeys = {
  all: ["prompts"] as const,
  lists: () => [...promptKeys.all, "list"] as const,
  /** Each combination of filters is its own cache entry, so going back to a
   * previous one shows its results immediately rather than refetching. */
  list: (filters: PromptListFilters) =>
    [...promptKeys.lists(), filters] as const,
  details: () => [...promptKeys.all, "detail"] as const,
  detail: (id: string) => [...promptKeys.details(), id] as const,
  versions: (id: string) => [...promptKeys.detail(id), "versions"] as const,
  channels: (id: string) => [...promptKeys.detail(id), "channels"] as const,
} as const;
