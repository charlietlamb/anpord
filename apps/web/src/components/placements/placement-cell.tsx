import type { PromptPlacements } from "@anpord/schema/domain/placements";
import { Button } from "@anpord/ui/components/button";
import { cn } from "@anpord/ui/lib/utils";
import { CaretUpDownIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PlacementPicker } from "@/components/placements/placement-picker";
import { VersionChange } from "@/components/placements/version-change";
import type { StagedChange } from "@/lib/placements/staged-changes";
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

  const served =
    prompt.placements.find((row) => row.channel === channel)?.version ?? null;
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
        aria-label={describe({
          behind,
          channel,
          name: prompt.name,
          served,
          staged,
        })}
        className={cn(
          "h-9 w-full justify-between gap-2 rounded-none px-3 font-normal",
          "data-[popup-open]:bg-muted",
          staged && "bg-muted"
        )}
        onFocus={() => setOpened(true)}
        onPointerEnter={() => setOpened(true)}
        variant="ghost"
      >
        <CellValue behind={behind} served={served} staged={staged} />
        <CaretUpDownIcon className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-60" />
      </Button>
    </PlacementPicker>
  );
}

interface CellValueProps {
  readonly behind: number;
  readonly served: number | null;
  readonly staged: StagedChange | undefined;
}

/** A staged cell reads as its destination with the version it leaves behind
 * struck through, so the change is legible without a second colour. */
function CellValue({ behind, served, staged }: CellValueProps) {
  if (staged) {
    return <VersionChange from={staged.from} to={staged.to} />;
  }

  if (served === null) {
    return <span className="text-muted-foreground">Not set</span>;
  }

  return (
    <span className="flex items-baseline gap-1.5 tabular-nums">
      <span className="font-medium text-[0.8125rem]">v{served}</span>
      {behind > 0 ? (
        <span className="text-muted-foreground">{behind} behind</span>
      ) : null}
    </span>
  );
}

/** Spelled out because "v2 5 behind" reads as nothing at all when spoken. */
const describe = ({
  behind,
  channel,
  name,
  served,
  staged,
}: {
  readonly behind: number;
  readonly channel: string;
  readonly name: string;
  readonly served: number | null;
  readonly staged: StagedChange | undefined;
}) => {
  if (staged) {
    const from = staged.from === null ? "not set" : `version ${staged.from}`;
    return `${name}, ${channel}, staged to move from ${from} to version ${staged.to}`;
  }
  if (served === null) {
    return `${name}, ${channel}, not set`;
  }
  return `${name}, ${channel}, version ${served}${behind > 0 ? `, ${behind} behind latest` : ""}`;
};
