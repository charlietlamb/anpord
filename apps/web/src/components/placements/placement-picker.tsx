import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { cn } from "@anpord/ui/lib/utils";
import { CheckIcon } from "@phosphor-icons/react";
import type { ReactElement } from "react";

interface PlacementPickerProps {
  readonly children: ReactElement;
  readonly latestVersion: number | null;
  readonly onPick: (version: number) => void;
  /** What the channel serves now, which is what the check marks and what
   * decides whether a row below it reads as a rollback. */
  readonly served: number | null;
  readonly versions: readonly ResolvedPrompt[];
}

export function PlacementPicker({
  children,
  latestVersion,
  onPick,
  served,
  versions,
}: PlacementPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />

      <DropdownMenuContent align="start" className="min-w-64">
        {versions.length === 0 ? (
          <DropdownMenuItem disabled>No versions yet</DropdownMenuItem>
        ) : null}

        {versions.map((row) => (
          <DropdownMenuItem
            className={cn(
              "gap-2",
              /** Anything below what is served now moves backwards, marked
               * here so the half of the list that rolls back is visible
               * before anything is clicked. */
              served !== null &&
                row.version < served &&
                "border-l-2 border-l-amber-500"
            )}
            key={row.versionId}
            onClick={() => onPick(row.version)}
          >
            <span className="w-4 shrink-0">
              {row.version === served ? (
                <CheckIcon className="size-3.5" />
              ) : null}
            </span>
            <span className="font-medium tabular-nums">v{row.version}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {row.commitMessage ?? "No message"}
            </span>
            {row.version === latestVersion ? (
              <span className="shrink-0 text-muted-foreground text-xs">
                latest
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
