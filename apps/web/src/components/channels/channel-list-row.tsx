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
import { ListRow } from "@/components/layout/list-row";

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
                className="size-6 shrink-0 rounded opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100 data-[popup-open]:opacity-100"
                onClick={(event) => event.stopPropagation()}
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
      <span className="font-medium text-foreground">{channel.name}</span>
      {reserved ? (
        /* The one channel that cannot be removed, said here rather than only
           discovered by opening the menu that refuses to do it. */
        <span className="ml-2.5 text-muted-foreground/60 text-xs">Default</span>
      ) : null}
    </ListRow>
  );
}
