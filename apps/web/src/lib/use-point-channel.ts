import type { ChannelPlacement } from "@anpord/schema/domain/prompts";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { toast } from "sonner";
import { useDialog } from "@/lib/dialog/dialogs";
import { useSetPromptChannel } from "@/lib/query/use-set-prompt-channel";

export function usePointChannel(
  promptId: string,
  placements: readonly ChannelPlacement[]
) {
  const { open: openDialog } = useDialog();
  const promote = useSetPromptChannel(promptId);

  const versionOn = (channel: string): number | null =>
    placements.find((placement) => placement.channel === channel)?.version ??
    null;

  const point = (channel: string, version: number) => {
    const servedBefore = versionOn(channel);

    return promote.mutate(
      { channel, version },
      {
        onError: (error) =>
          toast.error("Couldn't move the channel", {
            description: error instanceof Error ? error.message : undefined,
          }),
        onSuccess: () =>
          toast.success(`${channel} now serves v${version}`, {
            action:
              servedBefore === null
                ? undefined
                : {
                    label: `Undo to v${servedBefore}`,
                    onClick: () => point(channel, servedBefore),
                  },
          }),
      }
    );
  };

  return (channel: string, version: number) => {
    const current = versionOn(channel);

    if (channel !== PRODUCTION) {
      point(channel, version);
      return;
    }

    openDialog("confirm", {
      confirmLabel: `Promote v${version}`,
      description:
        current === null
          ? `Every caller asking for production will receive v${version}, immediately. You can point it elsewhere at any time. Versions are never overwritten.`
          : `Production serves v${current}. Every caller will receive v${version} instead, immediately. You can point it back to v${current} at any time. Versions are never overwritten.`,
      onConfirm: () => point(channel, version),
      title:
        current !== null && version < current
          ? `Roll production back to v${version}?`
          : `Promote v${version} to production?`,
    });
  };
}
