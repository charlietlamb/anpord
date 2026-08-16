import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { Badge } from "@anpord/ui/components/ui/badge";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="h-8 w-full justify-between gap-2 px-3.5 font-normal"
            disabled={disabled}
            variant="ghost"
          />
        }
      >
        <span className="truncate text-[0.8125rem] text-muted-foreground">
          {channel}
        </span>
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

      <DropdownMenuContent align="end" className="min-w-56">
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
