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
  changeFor,
  channels,
  onStage,
  onStageLatest,
  prompt,
}: PlacementRowProps) {
  return (
    <TableRow className="group/row">
      <TableCell className="px-4 py-2.5">
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

      <TableCell className="px-3 py-2.5">
        <LatestButton onStageLatest={onStageLatest} prompt={prompt} />
      </TableCell>

      {channels.map((channel) => (
        <TableCell className="p-0" key={channel}>
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

interface LatestButtonProps {
  readonly onStageLatest: (prompt: PromptPlacements) => void;
  readonly prompt: PromptPlacements;
}

/** Staging a whole row is the common act, so the newest version doubles as the
 * control that moves every channel onto it. */
function LatestButton({ onStageLatest, prompt }: LatestButtonProps) {
  if (prompt.latestVersion === null) {
    return <span className="text-muted-foreground text-xs">No versions</span>;
  }

  const behind = prompt.placements.some(
    (placement) => placement.version < (prompt.latestVersion ?? 0)
  );

  return (
    <Button
      className="h-7 px-2 font-medium tabular-nums"
      disabled={!behind}
      onClick={() => onStageLatest(prompt)}
      size="sm"
      title={
        behind
          ? `Stage every channel on this row to v${prompt.latestVersion}`
          : "Every channel is already on the newest version"
      }
      variant="ghost"
    >
      v{prompt.latestVersion}
    </Button>
  );
}
