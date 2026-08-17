import type { Channel } from "@anpord/schema/domain/channels";
import type {
  ChannelPlacement,
  ResolvedPrompt,
} from "@anpord/schema/domain/prompts";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";
import { PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { ChannelRow } from "@/components/prompts/channel-row";
import { RailCard } from "@/components/rail/rail-card";
import { channelQueries } from "@/lib/query/channel-queries";

interface ChannelsCardProps {
  readonly channels: readonly ChannelPlacement[];
  readonly onAddChannel: () => void;
  readonly onPoint: (channel: string, version: number) => void;
  /** Set while the placements are in flight, so no row claims a version yet. */
  readonly pending: boolean;
  readonly pointing: boolean;
  readonly versions: readonly ResolvedPrompt[];
}

interface Placement {
  readonly channel: string;
  readonly version: number | null;
}

/** Every channel the organisation defines is offered, whether or not this
 * prompt publishes to it, so pointing one at a version is a choice made here
 * rather than somewhere else first. Production leads because it is what
 * callers receive by default. */
const merged = (
  placements: readonly ChannelPlacement[],
  channels: readonly Channel[]
): readonly Placement[] => {
  const versionOf = new Map(
    placements.map((placement) => [placement.channel, placement.version])
  );
  const names = new Set([
    PRODUCTION,
    ...channels.map((channel) => channel.name),
    ...placements.map((placement) => placement.channel),
  ]);

  return [...names]
    .sort((left, right) => {
      if (left === PRODUCTION) {
        return -1;
      }
      if (right === PRODUCTION) {
        return 1;
      }
      return left.localeCompare(right);
    })
    .map((channel) => ({ channel, version: versionOf.get(channel) ?? null }));
};

export function ChannelsCard({
  channels,
  onAddChannel,
  onPoint,
  pending,
  pointing,
  versions,
}: ChannelsCardProps) {
  const defined = useQuery(channelQueries.list());

  return (
    <RailCard
      className={cn("flex flex-col px-0 py-0", ROW_DIVIDERS)}
      title="Channels"
    >
      {pending ? (
        <div className="flex h-8 items-center justify-between gap-2 px-3.5">
          <span className="truncate text-[0.8125rem] text-muted-foreground">
            {PRODUCTION}
          </span>
          <Skeleton className="h-3.5 w-6" />
        </div>
      ) : (
        merged(channels, defined.data ?? []).map((placement) => (
          <ChannelRow
            channel={placement.channel}
            disabled={pointing}
            key={placement.channel}
            onPoint={(version) => onPoint(placement.channel, version)}
            version={placement.version}
            versions={versions}
          />
        ))
      )}

      <Button
        className="h-8 w-full justify-start gap-2 rounded-none px-3.5 font-normal text-[0.8125rem] text-muted-foreground"
        disabled={pointing}
        onClick={onAddChannel}
        variant="ghost"
      >
        <PlusIcon className="size-3.5" />
        New channel
      </Button>
    </RailCard>
  );
}
