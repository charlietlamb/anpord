import { queryOptions } from "@tanstack/react-query";
import { listChannels, listPrompts, listVersions } from "@/lib/prompts-client";
import { promptKeys } from "@/lib/query/prompt-keys";

export const promptQueries = {
  list: () =>
    queryOptions({
      queryKey: promptKeys.lists(),
      queryFn: listPrompts,
    }),

  versions: (id: string) =>
    queryOptions({
      queryKey: promptKeys.versions(id),
      queryFn: () => listVersions(id),
    }),

  channels: (id: string) =>
    queryOptions({
      queryKey: promptKeys.channels(id),
      queryFn: () => listChannels(id),
    }),
} as const;
