import type { Channel } from "@anpord/schema/domain/channels";
import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { ChannelDot } from "@anpord/ui/components/ui/channel-dot";
import { CheckIcon, DotsThreeIcon } from "@phosphor-icons/react";
import { ROW_ACTION } from "@/components/layout/row-action";
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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Actions for v${version}`}
            className={ROW_ACTION}
            onClick={(event) => event.stopPropagation()}
            size="icon-sm"
            variant="bare"
          />
        }
      >
        <DotsThreeIcon />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-44">
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
