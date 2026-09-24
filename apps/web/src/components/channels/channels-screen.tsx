import type { Channel } from "@anpord/schema/domain/channels";
import { Button } from "@anpord/ui/components/button";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableSkeleton,
} from "@anpord/ui/components/ui/data-table";
import { BroadcastIcon, PlusIcon } from "@phosphor-icons/react";
import { ChannelListRow } from "@/components/channels/channel-list-row";
import { ListState } from "@/components/layout/list-state";
import { PageHeader } from "@/components/layout/page-header";
import { CHANNELS_TABLE } from "@/lib/settings/settings-tables";

const DESCRIPTION =
  "A channel points at one version, so you can ship a new one without a deploy.";

interface ChannelsScreenProps {
  readonly error: Error | null;
  readonly isPending: boolean;
  readonly onDelete: (channel: Channel) => void;
  readonly onEdit: (channel: Channel) => void;
  readonly onNew: () => void;
  readonly rows: readonly Channel[];
}

export function ChannelsScreen({
  error,
  isPending,
  onDelete,
  onEdit,
  onNew,
  rows,
}: ChannelsScreenProps) {
  return (
    <>
      <PageHeader
        actions={
          <Button onClick={onNew} size="sm">
            <PlusIcon />
            New channel
          </Button>
        }
        description={DESCRIPTION}
        title="Channels"
      />
      <ListState
        description={DESCRIPTION}
        empty={rows.length === 0}
        error={error}
        icon={<BroadcastIcon />}
        isPending={isPending}
        skeleton={<DataTableSkeleton {...CHANNELS_TABLE} rows={3} />}
        title="No channels yet"
      >
        <DataTable
          columns={CHANNELS_TABLE.columns}
          label={CHANNELS_TABLE.label}
        >
          <DataTableHead headings={CHANNELS_TABLE.headings} />
          <DataTableBody>
            {rows.map((channel) => (
              <ChannelListRow
                channel={channel}
                key={channel.name}
                onDelete={() => onDelete(channel)}
                onEdit={() => onEdit(channel)}
              />
            ))}
          </DataTableBody>
        </DataTable>
      </ListState>
    </>
  );
}
