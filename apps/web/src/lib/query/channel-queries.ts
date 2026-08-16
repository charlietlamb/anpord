import { queryOptions } from "@tanstack/react-query";
import { listChannels } from "@/lib/channels-client";
import { channelKeys } from "@/lib/query/channel-keys";

export const channelQueries = {
  list: () =>
    queryOptions({
      queryKey: channelKeys.lists(),
      queryFn: listChannels,
    }),
} as const;
