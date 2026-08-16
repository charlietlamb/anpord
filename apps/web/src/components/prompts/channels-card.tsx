import type {
  ChannelPlacement,
  ResolvedPrompt,
} from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import { Skeleton } from "@anpord/ui/components/skeleton";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";
import { PlusIcon } from "@phosphor-icons/react";
import { ChannelRow } from "@/components/prompts/channel-row";
import { RailCard } from "@/components/prompts/rail-card";

const PRODUCTION = "production";

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

/** Production is always offered, so a prompt with no channels reads the same
 * as one that has them rather than as an empty state to interpret. */
const withProduction = (
  channels: readonly ChannelPlacement[]
): readonly Placement[] =>
  channels.some((placement) => placement.channel === PRODUCTION)
    ? channels
    : [{ channel: PRODUCTION, version: null }, ...channels];

export function ChannelsCard({
  channels,
  onAddChannel,
  onPoint,
  pending,
  pointing,
  versions,
}: ChannelsCardProps) {
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
        withProduction(channels).map((placement) => (
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
