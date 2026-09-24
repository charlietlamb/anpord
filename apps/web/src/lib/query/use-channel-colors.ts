import type { ChannelColor } from "@anpord/ui/lib/channel-colors";
import { CHANNEL_DEFAULT_COLOR } from "@anpord/ui/lib/channel-colors";
import { useQuery } from "@tanstack/react-query";
import { channelQueries } from "@/lib/query/channel-queries";

export function useChannelColor(): (name: string) => ChannelColor {
  const { data } = useQuery(channelQueries.list());

  return (name) =>
    data?.find((channel) => channel.name === name)?.color ??
    CHANNEL_DEFAULT_COLOR;
}
