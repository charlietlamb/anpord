import {
  type ChannelColor,
  DEFAULT_CHANNEL_COLOR,
} from "@anpord/schema/domain/channels";
import { useQuery } from "@tanstack/react-query";
import { channelQueries } from "@/lib/query/channel-queries";

export function useChannelColor(): (name: string) => ChannelColor {
  const { data } = useQuery(channelQueries.list());

  return (name) =>
    data?.find((channel) => channel.name === name)?.color ??
    DEFAULT_CHANNEL_COLOR;
}
