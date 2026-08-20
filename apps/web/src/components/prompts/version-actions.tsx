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
import { useChannelColor } from "@/lib/query/use-channel-colors";

interface VersionActionsProps {
  /** Every channel the organisation defines, so a version can be pointed at
   * one whether or not it already serves something. */
  readonly channels: readonly Channel[];
  readonly onEditFrom: () => void;
  readonly onPromote: (channel: string) => void;
  /** Which channels this version already serves, so the menu can say so. */
  readonly servedBy: readonly string[];
  readonly version: number;
}

/**
 * What can be done to one version, from the row that names it.
 *
 * The channels sit in the menu under a heading rather than behind a submenu:
 * there are only ever a handful, and a submenu asks for a second aim of the
 * pointer to reach what the first one already had room to show.
 */
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
            className="size-5 shrink-0 rounded opacity-0 group-hover/version:opacity-100 data-[popup-open]:opacity-100"
            onClick={(event) => event.stopPropagation()}
            size="icon-sm"
            variant="bare"
          />
        }
      >
        <DotsThreeIcon weight="bold" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={onEditFrom}>
          Edit from v{version}
        </DropdownMenuItem>

        <DropdownMenuGroup>
          <DropdownMenuLabel>Promote to</DropdownMenuLabel>
          {channels.map((channel) => (
            <DropdownMenuItem
              key={channel.name}
              onClick={() => onPromote(channel.name)}
            >
              <ChannelDot color={channelColor(channel.name)} />
              <span className="flex-1 truncate">{channel.name}</span>
              {serves.has(channel.name) ? (
                <CheckIcon className="size-3.5 shrink-0" weight="bold" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
