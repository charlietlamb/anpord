import type { Channel } from "@anpord/schema/domain/channels";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { DropdownMenuItem } from "@anpord/ui/components/dropdown-menu";
import { Badge } from "@anpord/ui/components/ui/badge";
import { ChannelDot } from "@anpord/ui/components/ui/channel-dot";
import {
  DataTableRow,
  DataTableRowLink,
} from "@anpord/ui/components/ui/data-table";
import { DestructiveMenuItem } from "@/components/layout/destructive-menu-item";
import { RowActionsMenu } from "@/components/layout/row-actions-menu";

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
  const count = channel.promptCount;

  return (
    <DataTableRow linked>
      <span className="flex min-w-0 items-center gap-2.5">
        <ChannelDot color={channel.color} />
        <DataTableRowLink onClick={onEdit}>{channel.name}</DataTableRowLink>
        {reserved ? (
          <Badge size="xs" variant="outline">
            Default
          </Badge>
        ) : null}
      </span>

      <span className="text-muted-foreground tabular-nums">
        {count} {count === 1 ? "prompt" : "prompts"}
      </span>

      <RowActionsMenu label={`Actions for ${channel.name}`}>
        <DropdownMenuItem onClick={onEdit}>Edit channel</DropdownMenuItem>
        <DestructiveMenuItem
          disabled={reserved || count > 0}
          onClick={onDelete}
        >
          Delete
        </DestructiveMenuItem>
      </RowActionsMenu>
    </DataTableRow>
  );
}
