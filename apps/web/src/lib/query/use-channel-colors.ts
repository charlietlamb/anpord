import type { ChannelColor } from "@anpord/ui/lib/channel-colors";
import { CHANNEL_DEFAULT_COLOR } from "@anpord/ui/lib/channel-colors";
import { useQuery } from "@tanstack/react-query";
import { channelQueries } from "@/lib/query/channel-queries";

/**
 * Channel colours are owned by the organisation rather than by any one prompt,
 * so every badge resolves its colour through the same list rather than each
 * caller deciding for itself.
 */
export function useChannelColor(): (name: string) => ChannelColor {
  const { data } = useQuery(channelQueries.list());

  return (name) =>
    data?.find((channel) => channel.name === name)?.color ??
    CHANNEL_DEFAULT_COLOR;
}
