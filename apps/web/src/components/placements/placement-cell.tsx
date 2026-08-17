import type { PromptPlacements } from "@anpord/schema/domain/placements";
import { Button } from "@anpord/ui/components/button";
import { cn } from "@anpord/ui/lib/utils";
import { CaretUpDownIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { VersionMove } from "@/components/deployments/version-move";
import { PlacementPicker } from "@/components/placements/placement-picker";
import { isRollback, type StagedChange } from "@/lib/placements/staged-changes";
import { promptQueries } from "@/lib/query/prompt-queries";

interface PlacementCellProps {
  readonly channel: string;
  readonly onStage: (change: StagedChange) => void;
  readonly prompt: PromptPlacements;
  readonly staged: StagedChange | undefined;
}

export function PlacementCell({
  channel,
  onStage,
  prompt,
  staged,
}: PlacementCellProps) {
  /** Versions are only needed once a cell is opened, so a grid of fifty rows
   * does not fetch fifty version lists to render numbers it already has. */
  const [opened, setOpened] = useState(false);
  const versions = useQuery({
    ...promptQueries.versions(prompt.id),
    enabled: opened,
  });

  const placement = prompt.placements.find((row) => row.channel === channel);
  const served = placement?.version ?? null;
  const behind =
    served !== null && prompt.latestVersion !== null
      ? prompt.latestVersion - served
      : 0;

  return (
    <PlacementPicker
      latestVersion={prompt.latestVersion}
      onPick={(version) =>
        onStage({
          channel,
          from: served,
          promptId: prompt.id,
          promptName: prompt.name,
          to: version,
        })
      }
      served={served}
      versions={versions.data ?? []}
    >
      <Button
        aria-label={label({
          behind,
          channel,
          prompt: prompt.name,
          served,
          staged,
        })}
        className={cn(
          "h-auto w-full justify-between gap-2 rounded-none px-3 py-2.5 font-normal",
          "focus-visible:ring-inset data-[popup-open]:bg-sidebar-accent",
          staged &&
            (isRollback(staged)
              ? "border-l-2 border-l-amber-500 bg-amber-500/5"
              : "border-l-2 border-l-primary bg-primary/5")
        )}
        onFocus={() => setOpened(true)}
        onPointerEnter={() => setOpened(true)}
        variant="ghost"
      >
        <CellFace behind={behind} served={served} staged={staged} />
        <CaretUpDownIcon className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/cell:opacity-50" />
      </Button>
    </PlacementPicker>
  );
}

function CellFace({
  behind,
  served,
  staged,
}: {
  readonly behind: number;
  readonly served: number | null;
  readonly staged: StagedChange | undefined;
}) {
  if (staged) {
    return <VersionMove from={staged.from} to={staged.to} />;
  }

  if (served === null) {
    return <span className="text-muted-foreground text-xs">Not set</span>;
  }

  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-medium text-[0.8125rem] tabular-nums">
        v{served}
      </span>
      {behind > 0 ? (
        <span
          className="text-muted-foreground text-xs tabular-nums"
          title={`${behind} ${behind === 1 ? "version" : "versions"} behind latest`}
        >
          ·{behind}
        </span>
      ) : null}
    </span>
  );
}

/** Spelled out because "v2 ·5" reads as nothing at all when it is spoken. */
const label = ({
  behind,
  channel,
  prompt,
  served,
  staged,
}: {
  readonly behind: number;
  readonly channel: string;
  readonly prompt: string;
  readonly served: number | null;
  readonly staged: StagedChange | undefined;
}) => {
  if (staged) {
    return `${prompt}, ${channel}, staged to move from ${staged.from === null ? "nothing" : `version ${staged.from}`} to version ${staged.to}`;
  }
  if (served === null) {
    return `${prompt}, ${channel}, not set`;
  }
  return `${prompt}, ${channel}, version ${served}${behind > 0 ? `, ${behind} behind latest` : ""}`;
};
