import { Button } from "@anpord/ui/components/button";
import { ActionCluster } from "@anpord/ui/components/ui/action-cluster";
import { ActionTooltip } from "@anpord/ui/components/ui/action-tooltip";
import { CopyAction } from "@anpord/ui/components/ui/copy-action";
import { ShortcutButton } from "@anpord/ui/components/ui/shortcut-button";
import { cn } from "@anpord/ui/lib/utils";
import {
  ArrowUpIcon,
  IdentificationCardIcon,
  LinkSimpleIcon,
  SpinnerGapIcon,
  XIcon,
} from "@phosphor-icons/react";

interface PromptEditorActionsProps {
  /** Set while a past version is being rewritten rather than branched from. */
  readonly correctingVersion: number | null;
  readonly dirty: boolean;
  readonly onCancelCorrection: () => void;
  readonly onSave: () => void;
  /** What callers pass to prompts.get, which is the thing worth copying into
   * code rather than the address of the page it is edited on. */
  readonly promptId: string;
  readonly saving: boolean;
}

/**
 * What can be done to the prompt, at the head of the rail beside everything
 * else that acts on it. The name is edited where it is read, so only the acts
 * that have no place on the page itself appear here.
 */
export function PromptEditorActions({
  correctingVersion,
  dirty,
  onCancelCorrection,
  onSave,
  promptId,
  saving,
}: PromptEditorActionsProps) {
  const correcting = correctingVersion !== null;
  const saveLabel = correcting
    ? `Overwrite v${correctingVersion}`
    : "Save version";
  const armed = dirty || saving;

  return (
    <ActionCluster>
      {/* Read at click time: the server has no address, and the one worth
          copying is whatever the reader is looking at. */}
      <CopyAction
        copiedLabel="Link copied"
        icon={LinkSimpleIcon}
        label="Copy link"
        value={() => window.location.href}
      />
      <CopyAction
        copiedLabel="Identifier copied"
        icon={IdentificationCardIcon}
        label="Copy identifier"
        value={promptId}
      />

      {correcting ? (
        <ActionTooltip label="Cancel correction">
          <Button
            aria-label="Cancel correction"
            onClick={onCancelCorrection}
            size="icon-round"
            variant="subtle"
          >
            <XIcon />
          </Button>
        </ActionTooltip>
      ) : null}

      {/* One button throughout, changing weight rather than being swapped for
          another: with unsaved work it fills and states what it will do, and
          without it recedes to the quietest thing in the cluster. Keeping it
          filled and inert the rest of the time would teach a reader to stop
          seeing it. */}
      <ShortcutButton
        className={cn(
          "h-8 shrink-0 rounded-full px-3.5 transition-surface",
          armed ? undefined : "disabled:opacity-100"
        )}
        disabled={!armed}
        metaShortcut="enter"
        onClick={onSave}
        size="sm"
        /* Both the fill and the caps' contrast follow from the variant, so the
           button changes weight without changing component. */
        variant={armed ? "default" : "subtle"}
      >
        {saving ? (
          <SpinnerGapIcon className="animate-spin" size={15} />
        ) : (
          <ArrowUpIcon size={15} weight="bold" />
        )}
        {saveLabel}
      </ShortcutButton>
    </ActionCluster>
  );
}
