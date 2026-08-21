import { infiniteQueryOptions } from "@tanstack/react-query";
import { listActivity } from "@/lib/activity-client";
import { activityKeys } from "@/lib/query/activity-keys";

/** Enough to fill the screen once; the rest arrives when it is asked for. */
const PAGE_SIZE = 25;

export const activityQueries = {
  /** Paged rather than capped: the feed is the whole history of a prompt, and
   * a fixed limit would drop the middle of it without saying so. */
  forPrompt: (promptId: string) =>
    infiniteQueryOptions({
      queryKey: activityKeys.forPrompt(promptId),
      queryFn: ({ pageParam }) =>
        listActivity({
          cursor: pageParam,
          limit: PAGE_SIZE,
          prompt: promptId,
        }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    }),
} as const;
