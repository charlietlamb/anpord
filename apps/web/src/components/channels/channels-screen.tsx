import type { Channel } from "@anpord/schema/domain/channels";
import { Button } from "@anpord/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react";
import { ChannelListRow } from "@/components/channels/channel-list-row";
import { ChannelListSkeleton } from "@/components/channels/channel-list-skeleton";
import { ListState } from "@/components/layout/list-state";
import { PageShell } from "@/components/layout/page-shell";

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
  const newChannel = (
    <Button onClick={onNew} size="sm">
      <PlusIcon weight="bold" />
      New channel
    </Button>
  );

  return (
    <PageShell
      actions={newChannel}
      description={
        <>
          A channel points at one version. Your code asks for{" "}
          <span className="font-mono text-foreground">production</span> and gets
          whatever it points at, so you can ship a new version without a deploy.
        </>
      }
    >
      <ListState
        action={newChannel}
        description="Create one to publish a version under a name."
        empty={rows.length === 0}
        error={error}
        isPending={isPending}
        skeleton={<ChannelListSkeleton />}
        title="No channels yet"
      >
        <div className="flex flex-col">
          {rows.map((channel) => (
            <ChannelListRow
              channel={channel}
              key={channel.name}
              onDelete={() => onDelete(channel)}
              onEdit={() => onEdit(channel)}
            />
          ))}
        </div>
      </ListState>
    </PageShell>
  );
}
