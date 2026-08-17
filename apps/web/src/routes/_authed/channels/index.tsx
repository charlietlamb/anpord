import type { Channel } from "@anpord/schema/domain/channels";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChannelsScreen } from "@/components/channels/channels-screen";
import { useDialog } from "@/lib/dialog/dialogs";
import { channelQueries } from "@/lib/query/channel-queries";
import {
  useCreateChannel,
  useDeleteChannel,
  useUpdateChannel,
} from "@/lib/query/use-channel-mutations";

export const Route = createFileRoute("/_authed/channels/")({
  component: ChannelsPage,
  loader: async ({ context }) => {
    const { channelQueries: queries } = await import(
      "@/lib/query/channel-queries"
    );
    return context.queryClient.ensureQueryData(queries.list());
  },
});

const failed = (message: string) => (error: unknown) =>
  toast.error(message, {
    description: error instanceof Error ? error.message : undefined,
  });

function ChannelsPage() {
  const { open: openDialog } = useDialog();
  const channels = useQuery(channelQueries.list());

  const create = useCreateChannel();
  const update = useUpdateChannel();
  const remove = useDeleteChannel();

  const onNew = () =>
    openDialog("channel", {
      onSubmit: (value) =>
        create.mutate(value, {
          onError: failed("Couldn't create the channel"),
          onSuccess: () => toast.success(`Created ${value.name}`),
        }),
    });

  const onEdit = (channel: Channel) =>
    openDialog("channel", {
      color: channel.color,
      name: channel.name,
      onSubmit: (value) =>
        update.mutate(
          { color: value.color, current: channel.name, name: value.name },
          {
            onError: failed("Couldn't save the channel"),
            onSuccess: () => toast.success("Channel saved"),
          }
        ),
    });

  const onDelete = (channel: Channel) =>
    openDialog("confirm", {
      confirmLabel: `Delete ${channel.name}`,
      description: `${channel.name} will no longer be available to point at a version.`,
      destructive: true,
      onConfirm: () =>
        remove.mutate(channel.name, {
          onError: failed("Couldn't delete the channel"),
          onSuccess: () => toast.success(`Deleted ${channel.name}`),
        }),
      title: `Delete ${channel.name}?`,
    });

  return (
    <ChannelsScreen
      error={channels.error}
      isPending={channels.isPending}
      onDelete={onDelete}
      onEdit={onEdit}
      onNew={onNew}
      rows={channels.data ?? []}
    />
  );
}
