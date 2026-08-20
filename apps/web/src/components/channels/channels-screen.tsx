import type { Channel } from "@anpord/schema/domain/channels";
import { Button } from "@anpord/ui/components/button";
import { ROW_DIVIDERS } from "@anpord/ui/lib/row-dividers";
import { cn } from "@anpord/ui/lib/utils";
import { PlusIcon } from "@phosphor-icons/react";
import { ChannelListRow } from "@/components/channels/channel-list-row";

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
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-y-auto px-5 pt-5 pb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Channels</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            A channel points at one version. Your code asks for{" "}
            <span className="font-mono text-foreground/80">production</span> and
            gets whatever it points at, so you can ship a new version without a
            deploy.
          </p>
        </div>
        <Button className="shrink-0" onClick={onNew} size="sm">
          <PlusIcon weight="bold" />
          New channel
        </Button>
      </div>

      <ChannelsBody
        error={error}
        isPending={isPending}
        onDelete={onDelete}
        onEdit={onEdit}
        rows={rows}
      />
    </div>
  );
}

interface ChannelsBodyProps {
  readonly error: Error | null;
  readonly isPending: boolean;
  readonly onDelete: (channel: Channel) => void;
  readonly onEdit: (channel: Channel) => void;
  readonly rows: readonly Channel[];
}

function ChannelsBody({
  error,
  isPending,
  onDelete,
  onEdit,
  rows,
}: ChannelsBodyProps) {
  if (isPending) {
    return <p className="mt-5 text-muted-foreground text-sm">Loading…</p>;
  }

  if (error) {
    return (
      <p className="mt-5 text-muted-foreground text-sm">
        Couldn't load your channels. {error.message}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mt-5 py-14 text-center">
        <p className="font-heading text-base tracking-tight">No channels yet</p>
        <p className="mt-1 text-muted-foreground text-sm">
          Create one to publish a version under a name.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("-mx-3 mt-5 flex flex-col", ROW_DIVIDERS)}>
      {rows.map((channel) => (
        <ChannelListRow
          channel={channel}
          key={channel.name}
          onDelete={() => onDelete(channel)}
          onEdit={() => onEdit(channel)}
        />
      ))}
    </div>
  );
}
