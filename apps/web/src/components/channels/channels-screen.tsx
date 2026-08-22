import type { Channel } from "@anpord/schema/domain/channels";
import { Button } from "@anpord/ui/components/button";
import { PageHeading } from "@anpord/ui/components/ui/page-heading";
import { BroadcastIcon, PlusIcon } from "@phosphor-icons/react";
import { ChannelListRow } from "@/components/channels/channel-list-row";
import { ChannelListSkeleton } from "@/components/channels/channel-list-skeleton";
import { ListState } from "@/components/layout/list-state";
import { PageShell } from "@/components/layout/page-shell";
import { useListKeyboardNav } from "@/lib/use-list-keyboard-nav";

interface ChannelsScreenProps {
  readonly error: Error | null;
  readonly isPending: boolean;
  readonly onDelete: (channel: Channel) => void;
  readonly onEdit: (channel: Channel) => void;
  readonly onNew: () => void;
  readonly rows: readonly Channel[];
}

/** Presentation only, so the dev harness renders the same screen the route
 * does rather than a copy that can drift from it. */
export function ChannelsScreen({
  error,
  isPending,
  onDelete,
  onEdit,
  onNew,
  rows,
}: ChannelsScreenProps) {
  const nav = useListKeyboardNav(rows.length);

  const newChannel = (
    <Button onClick={onNew} size="sm">
      <PlusIcon weight="bold" />
      New channel
    </Button>
  );

  return (
    <PageShell
      actions={newChannel}
      leading={<PageHeading icon={BroadcastIcon} title="Channels" />}
    >
      <ListState
        action={newChannel}
        description="A channel points at one version, so you can ship a new one without a deploy."
        empty={rows.length === 0}
        error={error}
        icon={<BroadcastIcon />}
        isPending={isPending}
        skeleton={<ChannelListSkeleton />}
        title="No channels yet"
      >
        <div
          aria-label="Channels"
          className="flex flex-col"
          onKeyDown={nav.onKeyDown}
          role="listbox"
          tabIndex={-1}
        >
          {rows.map((channel, index) => (
            <ChannelListRow
              channel={channel}
              key={channel.name}
              onDelete={() => onDelete(channel)}
              onEdit={() => onEdit(channel)}
              onMouseEnter={() => nav.setActiveIndex(index)}
              ref={nav.registerRow(index)}
              tabIndex={index === nav.activeIndex ? 0 : -1}
            />
          ))}
        </div>
      </ListState>
    </PageShell>
  );
}
