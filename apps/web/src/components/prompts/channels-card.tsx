import type {
  ChannelPlacement,
  ResolvedPrompt,
} from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import { Badge } from "@anpord/ui/components/ui/badge";
import { DetailRow } from "@/components/prompts/detail-row";
import { RailCard } from "@/components/prompts/rail-card";

interface ChannelsCardProps {
  readonly channels: readonly ChannelPlacement[];
  readonly onPromote: (channel: string) => void;
  readonly promoting: boolean;
  readonly viewed: ResolvedPrompt;
}

export function ChannelsCard({
  channels,
  onPromote,
  promoting,
  viewed,
}: ChannelsCardProps) {
  return (
    <RailCard className="grid gap-2.5" title="Channels">
      {channels.length === 0 ? (
        <DetailRow label="production">
          <Badge
            className="h-5 px-2 font-medium text-[0.6875rem]"
            variant="outline"
          >
            Not set
          </Badge>
        </DetailRow>
      ) : (
        channels.map((placement) => (
          <DetailRow key={placement.channel} label={placement.channel}>
            <span className="tabular-nums">v{placement.version}</span>
          </DetailRow>
        ))
      )}

      {channels.map((placement) =>
        placement.version === viewed.version ? null : (
          <Button
            className="w-full justify-start"
            disabled={promoting}
            key={`promote-${placement.channel}`}
            onClick={() => onPromote(placement.channel)}
            size="sm"
            variant="outline"
          >
            Point {placement.channel} at v{viewed.version}
          </Button>
        )
      )}
    </RailCard>
  );
}
