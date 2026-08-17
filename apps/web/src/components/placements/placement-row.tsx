import type { PromptPlacements } from "@anpord/schema/domain/placements";
import { Button } from "@anpord/ui/components/button";
import { TableCell, TableRow } from "@anpord/ui/components/ui/table";
import { Link } from "@tanstack/react-router";
import { PlacementCell } from "@/components/placements/placement-cell";
import type { StagedChange } from "@/lib/placements/staged-changes";

interface PlacementRowProps {
  readonly changeFor: (
    promptId: string,
    channel: string
  ) => StagedChange | undefined;
  readonly channels: readonly string[];
  readonly onStage: (change: StagedChange) => void;
  readonly onStageLatest: (prompt: PromptPlacements) => void;
  readonly prompt: PromptPlacements;
}

export function PlacementRow({
  channels,
  changeFor,
  onStage,
  onStageLatest,
  prompt,
}: PlacementRowProps) {
  const anyBehind = prompt.placements.some(
    (placement) =>
      prompt.latestVersion !== null && placement.version < prompt.latestVersion
  );

  return (
    <TableRow className="group/row">
      <TableCell className="sticky left-0 z-10 bg-sidebar-accent">
        <Link
          className="flex min-w-0 flex-col gap-0.5"
          params={{ id: prompt.id }}
          to="/prompts/$id"
        >
          <span className="truncate font-medium text-[0.8125rem] hover:underline">
            {prompt.name}
          </span>
          <span className="truncate font-mono text-muted-foreground text-xs">
            {prompt.id}
          </span>
        </Link>
      </TableCell>

      <TableCell>
        {prompt.latestVersion === null ? (
          <span className="text-muted-foreground text-xs">No versions</span>
        ) : (
          <Button
            className="h-7 gap-1.5 px-2 font-normal tabular-nums"
            disabled={!anyBehind}
            onClick={() => onStageLatest(prompt)}
            size="sm"
            title={
              anyBehind
                ? `Stage every channel on this row to v${prompt.latestVersion}`
                : "Every channel is already on the newest version"
            }
            variant="ghost"
          >
            v{prompt.latestVersion}
          </Button>
        )}
      </TableCell>

      {channels.map((channel) => (
        <TableCell className="group/cell p-0" key={channel}>
          <PlacementCell
            channel={channel}
            onStage={onStage}
            prompt={prompt}
            staged={changeFor(prompt.id, channel)}
          />
        </TableCell>
      ))}
    </TableRow>
  );
}
