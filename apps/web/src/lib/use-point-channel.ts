import type { ChannelPlacement } from "@anpord/schema/domain/prompts";
import { PRODUCTION } from "@anpord/schema/domain/prompts";
import { toast } from "sonner";
import { useDialog } from "@/lib/dialog/dialogs";
import { useSetPromptChannel } from "@/lib/query/use-set-prompt-channel";

/**
 * Pointing a channel at a version, and asking first where that changes what
 * callers already receive.
 */
export function usePointChannel(
  promptId: string,
  placements: readonly ChannelPlacement[]
) {
  const { open: openDialog } = useDialog();
  const promote = useSetPromptChannel(promptId);

  /** Where a channel sits now, which both the confirmation and the undo need
   * and neither should recompute. */
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

  /** Naming both ends is what makes this a decision rather than a restatement:
   * a caller cannot tell a routine step forward from a rollback nine versions
   * back without being told where the channel is now. */
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
