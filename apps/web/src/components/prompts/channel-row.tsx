import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { Badge } from "@anpord/ui/components/ui/badge";
import { ChannelBadge } from "@anpord/ui/components/ui/channel-badge";
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
            className="h-8 w-full justify-between gap-2 rounded-none px-3.5 font-normal focus-visible:ring-0 focus-visible:ring-offset-0 data-[popup-open]:bg-sidebar-accent"
            disabled={disabled}
            variant="ghost"
          />
        }
      >
        <ChannelBadge color={channelColor(channel)} name={channel} size="xs" />
        <span className="flex shrink-0 items-center gap-1.5">
          {version === null ? (
            <Badge size="xs" variant="outline">
              Not set
            </Badge>
          ) : (
            <span className="font-medium text-[0.8125rem] tabular-nums">
              v{version}
            </span>
          )}
          <CaretUpDownIcon className="size-3.5 opacity-50" />
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-(--anchor-width) max-w-(--anchor-width)"
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
