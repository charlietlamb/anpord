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
import type { Ref } from "react";
import { ListRow, RowTitle } from "@/components/layout/list-row";
import { ROW_ACTION } from "@/components/layout/row-action";

interface ChannelListRowProps {
  readonly channel: Channel;
  readonly onDelete: () => void;
  readonly onEdit: () => void;
  readonly onMouseEnter?: () => void;
  readonly ref?: Ref<HTMLElement>;
  readonly tabIndex?: number;
}

export function ChannelListRow({
  channel,
  onDelete,
  onEdit,
  onMouseEnter,
  ref,
  tabIndex,
}: ChannelListRowProps) {
  const reserved = channel.name === PRODUCTION;
  const count = channel.promptCount;

  return (
    <ListRow
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={`Actions for ${channel.name}`}
                className={ROW_ACTION}
                onClick={(event) => event.stopPropagation()}
                size="icon-sm"
                variant="bare"
              />
            }
          >
            <DotsThreeIcon />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Edit channel</DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={reserved || count > 0}
              onClick={onDelete}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      leading={<ChannelDot color={channel.color} />}
      meta={`${count} ${count === 1 ? "prompt" : "prompts"}`}
      onMouseEnter={onMouseEnter}
      onSelect={onEdit}
      ref={ref}
      tabIndex={tabIndex}
    >
      <RowTitle>{channel.name}</RowTitle>
      {reserved ? (
        <span className="ml-2.5 text-muted-foreground/60 text-xs">Default</span>
      ) : null}
    </ListRow>
  );
}
