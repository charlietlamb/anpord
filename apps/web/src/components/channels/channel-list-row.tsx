import type { Channel } from "@anpord/schema/domain/channels";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { ChannelBadge } from "@anpord/ui/components/ui/channel-badge";
import { DotsThreeIcon } from "@phosphor-icons/react";

interface ChannelListRowProps {
  readonly channel: Channel;
  readonly onDelete: () => void;
  readonly onEdit: () => void;
}

export function ChannelListRow({
  channel,
  onDelete,
  onEdit,
}: ChannelListRowProps) {
  /** Production is named in the schema, the MCP tools and the SDK, so it is
   * the one channel that cannot be renamed away or removed. */
  const reserved = channel.name === PRODUCTION;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <ChannelBadge color={channel.color} name={channel.name} />

      <span className="ml-auto text-muted-foreground text-xs tabular-nums">
        {channel.promptCount} {channel.promptCount === 1 ? "prompt" : "prompts"}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`Actions for ${channel.name}`}
              className="size-7 shrink-0"
              size="icon"
              variant="ghost"
            >
              <DotsThreeIcon size={16} weight="bold" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>Edit channel</DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={reserved || channel.promptCount > 0}
            onClick={onDelete}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
