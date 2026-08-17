import type { PromptPlacements } from "@anpord/schema/domain/placements";
import { ChannelBadge } from "@anpord/ui/components/ui/channel-badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@anpord/ui/components/ui/table";
import { PlacementRow } from "@/components/placements/placement-row";
import type { StagedChange } from "@/lib/placements/staged-changes";
import { useChannelColor } from "@/lib/query/use-channel-colors";

interface PlacementGridProps {
  readonly changeFor: (
    promptId: string,
    channel: string
  ) => StagedChange | undefined;
  readonly channels: readonly string[];
  readonly onStage: (change: StagedChange) => void;
  readonly onStageLatest: (prompt: PromptPlacements) => void;
  readonly rows: readonly PromptPlacements[];
}

export function PlacementGrid({
  changeFor,
  channels,
  onStage,
  onStageLatest,
  rows,
}: PlacementGridProps) {
  const channelColor = useChannelColor();

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border-surface bg-sidebar-accent">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4">Prompt</TableHead>
            <TableHead className="px-3">Latest</TableHead>
            {channels.map((channel) => (
              <TableHead className="px-3" key={channel}>
                <ChannelBadge
                  color={channelColor(channel)}
                  name={channel}
                  size="xs"
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((prompt) => (
            <PlacementRow
              changeFor={changeFor}
              channels={channels}
              key={prompt.id}
              onStage={onStage}
              onStageLatest={onStageLatest}
              prompt={prompt}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
