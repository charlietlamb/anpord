import type { Channel } from "@anpord/schema/domain/channels";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChannelsScreen } from "@/components/channels/channels-screen";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useDialog } from "@/lib/dialog/dialogs";

export const Route = createFileRoute("/dev/channels")({
  component: ChannelsPreview,
});

/** Fixed so the screen renders identically on every visit rather than moving
 * with the clock. */
const EPOCH = new Date("2026-08-16T12:00:00.000Z");

const SEED = [
  { color: "green", name: "production", promptCount: 5 },
  { color: "blue", name: "staging", promptCount: 3 },
  { color: "amber", name: "canary", promptCount: 1 },
  { color: "purple", name: "experimental", promptCount: 0 },
] as const;

const asChannel = (seed: (typeof SEED)[number]): Channel =>
  ({ ...seed, createdAt: EPOCH }) as Channel;

function ChannelsPreview() {
  const { open: openDialog } = useDialog();
  const [rows, setRows] = useState<readonly Channel[]>(() =>
    SEED.map(asChannel)
  );

  const onNew = () =>
    openDialog("channel", {
      onSubmit: (value) =>
        setRows((current) => [
          ...current,
          asChannel({ ...value, promptCount: 0 } as never),
        ]),
    });

  const onEdit = (channel: Channel) =>
    openDialog("channel", {
      color: channel.color,
      name: channel.name,
      onSubmit: (value) =>
        setRows((current) =>
          current.map((row) =>
            row.name === channel.name
              ? asChannel({ ...value, promptCount: row.promptCount } as never)
              : row
          )
        ),
    });

  const onDelete = (channel: Channel) =>
    openDialog("confirm", {
      confirmLabel: `Delete ${channel.name}`,
      description: `${channel.name} will no longer be available to point at a version.`,
      destructive: true,
      onConfirm: () =>
        setRows((current) =>
          current.filter((row) => row.name !== channel.name)
        ),
      title: `Delete ${channel.name}?`,
    });

  return (
    <DashboardShell sidebarOpen>
      <ChannelsScreen
        error={null}
        isPending={false}
        onDelete={onDelete}
        onEdit={onEdit}
        onNew={onNew}
        rows={rows}
      />
    </DashboardShell>
  );
}
