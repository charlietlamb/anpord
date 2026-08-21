import type { Channel } from "@anpord/schema/domain/channels";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { ChannelDot } from "@anpord/ui/components/ui/channel-dot";
import { DotsThreeIcon } from "@phosphor-icons/react";
import { ListRow } from "@/components/layout/list-row";

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
  const reserved = channel.name === PRODUCTION;

  return (
    <ListRow
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Actions for ${channel.name}`}
                className="size-5 shrink-0 rounded opacity-0 group-hover/row:opacity-100 data-[popup-open]:opacity-100"
                size="icon-sm"
                variant="bare"
              />
            }
          >
            <DotsThreeIcon weight="bold" />
          </DropdownMenuTrigger>

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
      }
      leading={<ChannelDot color={channel.color} />}
      meta={`${channel.promptCount} ${channel.promptCount === 1 ? "prompt" : "prompts"}`}
    >
      <span className="text-foreground">{channel.name}</span>
    </ListRow>
  );
}
