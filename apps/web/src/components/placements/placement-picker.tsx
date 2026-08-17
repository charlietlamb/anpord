import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { CheckIcon } from "@phosphor-icons/react";
import type { ReactElement } from "react";

interface PlacementPickerProps {
  readonly children: ReactElement;
  readonly latestVersion: number | null;
  readonly onPick: (version: number) => void;
  /** What the channel serves now, which is what the check marks. */
  readonly served: number | null;
  readonly versions: readonly ResolvedPrompt[];
}

/** The list the prompt rail already uses to point a channel, so pointing one
 * from the grid is the act people know rather than a second one. */
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

      <DropdownMenuContent align="start" className="min-w-72">
        {versions.length === 0 ? (
          <DropdownMenuItem disabled>No versions yet</DropdownMenuItem>
        ) : null}

        {versions.map((version) => (
          <DropdownMenuItem
            className="gap-2"
            key={version.versionId}
            onClick={() => onPick(version.version)}
          >
            <span className="w-4 shrink-0">
              {version.version === served ? (
                <CheckIcon className="size-3.5" />
              ) : null}
            </span>
            <span className="font-medium tabular-nums">v{version.version}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {version.commitMessage ?? "No message"}
            </span>
            {version.version === latestVersion ? (
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
