import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { ChannelDot } from "@anpord/ui/components/ui/channel-dot";
import { BLEED_ROW } from "@anpord/ui/lib/bleed-row";
import { cn } from "@anpord/ui/lib/utils";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";
import { useChannelColor } from "@/lib/query/use-channel-colors";

interface ChannelRowProps {
  readonly channel: string;
  readonly disabled: boolean;
  readonly onPoint: (version: number) => void;
  readonly version: number | null;
  readonly versions: readonly ResolvedPrompt[];
}

export function ChannelRow({
  channel,
  disabled,
  onPoint,
  version,
  versions,
}: ChannelRowProps) {
  const channelColor = useChannelColor();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className={cn(
              BLEED_ROW,
              "h-7 justify-between gap-2 rounded-md font-normal text-muted-foreground data-[popup-open]:bg-muted"
            )}
            disabled={disabled}
            variant="ghost"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChannelDot color={channelColor(channel)} />
          <span className="truncate text-label">{channel}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="text-label tabular-nums">
            {version === null ? "Not set" : `v${version}`}
          </span>
          <CaretUpDownIcon className="size-3 opacity-40" />
        </span>
      </DropdownMenuTrigger>

      {/* Rows of the same shape read as one block without a rule between them,
          the way the version list in the rail is separated. */}
      <DropdownMenuContent
        align="start"
        /* Parted by the faintest edge rather than the card's border: inside a
           lifted surface that weight reads as a rule instead of a seam. */
        className="w-(--anchor-width) max-w-(--anchor-width) p-0 [&>*:not(:first-child)]:border-t [&>*:not(:first-child)]:border-t-alpha-6 [&>*]:rounded-none"
      >
        {versions.map((row) => (
          <DropdownMenuItem
            className="gap-2"
            key={row.versionId}
            onClick={() => onPoint(row.version)}
          >
            <span className="w-4 shrink-0">
              {row.version === version ? (
                <CheckIcon className="size-3.5" />
              ) : null}
            </span>
            <span className="font-medium tabular-nums">v{row.version}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {row.commitMessage ?? "No message"}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
