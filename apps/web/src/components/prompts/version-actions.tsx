import type { Channel } from "@anpord/schema/domain/channels";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@anpord/ui/components/dropdown-menu";
import { ChannelDot } from "@anpord/ui/components/ui/channel-dot";
import { CheckIcon } from "@phosphor-icons/react";
import { RowActionsMenu } from "@/components/layout/row-actions-menu";
import { useChannelColor } from "@/lib/query/use-channel-colors";

interface VersionActionsProps {
  readonly channels: readonly Channel[];
  readonly onEditFrom: () => void;
  readonly onPromote: (channel: string) => void;
  readonly servedBy: readonly string[];
  readonly version: number;
}

export function VersionActions({
  channels,
  onEditFrom,
  onPromote,
  servedBy,
  version,
}: VersionActionsProps) {
  const channelColor = useChannelColor();
  const serves = new Set(servedBy);

  return (
    <RowActionsMenu
      className="opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100 data-[popup-open]:opacity-100"
      label={`Actions for v${version}`}
    >
      <DropdownMenuItem onClick={onEditFrom}>
        Edit from v{version}
      </DropdownMenuItem>

      <DropdownMenuGroup>
        <DropdownMenuLabel>Promote to</DropdownMenuLabel>

        {channels.map((channel) => (
          <DropdownMenuItem
            closeOnClick={false}
            key={channel.name}
            onClick={() => onPromote(channel.name)}
          >
            <ChannelDot color={channelColor(channel.name)} />
            <span className="flex-1 truncate">{channel.name}</span>
            {serves.has(channel.name) ? (
              <CheckIcon className="size-3.5 shrink-0" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </RowActionsMenu>
  );
}
