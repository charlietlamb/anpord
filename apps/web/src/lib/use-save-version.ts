import type { ChannelPlacement } from "@anpord/schema/domain/prompts";
import { toast } from "sonner";
import { useDialog } from "@/lib/dialog/dialogs";
import { useAddPromptVersion } from "@/lib/query/use-add-prompt-version";
import { useUpdatePromptVersion } from "@/lib/query/use-update-prompt-version";

/** Naming the channels is what tells an author whether a correction is a
 * private tidy-up or an immediate change to what callers receive. */
const listChannels = (names: readonly string[]): string =>
  names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

interface SaveVersionOptions {
  /** Holds the page on the version that was rewritten, which is what the
   * author was reading. */
  readonly onOverwritten: (version: number) => void;
  /** Returns the page to the newest version once a write has landed. */
  readonly onSaved: () => void;
  /** Where each channel points, so an overwrite can say who it reaches. */
  readonly placements: readonly ChannelPlacement[];
  readonly promptId: string;
}

/**
 * The two ways a prompt is written: appending a version, and rewriting one in
 * place. The second destroys what was there, so it asks first, and names the
 * channels that would change for callers immediately.
 */
export function useSaveVersion({
  onOverwritten,
  onSaved,
  placements,
  promptId,
}: SaveVersionOptions) {
  const { open: openDialog } = useDialog();
  const addVersion = useAddPromptVersion(promptId);
  const correctVersion = useUpdatePromptVersion(promptId);

  const servedBy = (version: number): readonly string[] =>
    placements.reduce<string[]>((names, placement) => {
      if (placement.version === version) {
        names.push(placement.channel);
      }
      return names;
    }, []);

  const append = (content: string) =>
    addVersion.mutate(
      { content },
      {
        onError: (error) =>
          toast.error("Couldn't save the version", {
            description: error instanceof Error ? error.message : undefined,
          }),
        onSuccess: (created) => {
          onSaved();
          toast.success(`Saved v${created.version}`, {
            description: "Point a channel at it to publish.",
          });
        },
      }
    );

  const overwrite = (content: string, version: number) =>
    correctVersion.mutate(
      { content, version },
      {
        onError: (error) =>
          toast.error(`Couldn't overwrite v${version}`, {
            description: error instanceof Error ? error.message : undefined,
          }),
        onSuccess: () => {
          onOverwritten(version);
          toast.success(`Overwrote v${version}`);
        },
      }
    );

  return {
    save: (content: string, correctingVersion: number | null) => {
      if (correctingVersion === null) {
        append(content);
        return;
      }

      const served = servedBy(correctingVersion);
      openDialog("confirm", {
        confirmLabel: `Overwrite v${correctingVersion}`,
        description: served.length
          ? `v${correctingVersion} is served by ${listChannels(served)}, so callers will receive these changes immediately. The original content cannot be recovered.`
          : `The original content of v${correctingVersion} cannot be recovered.`,
        destructive: true,
        onConfirm: () => overwrite(content, correctingVersion),
        title: `Overwrite v${correctingVersion}?`,
      });
    },
    saving: addVersion.isPending || correctVersion.isPending,
    servedBy,
  };
}
