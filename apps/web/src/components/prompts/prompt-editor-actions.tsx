import { Button } from "@anpord/ui/components/button";
import { ActionCluster } from "@anpord/ui/components/ui/action-cluster";
import { ActionTooltip } from "@anpord/ui/components/ui/action-tooltip";
import { ArrowUpIcon, SpinnerGapIcon, XIcon } from "@phosphor-icons/react";

interface PromptEditorActionsProps {
  /** Set while a past version is being rewritten rather than branched from. */
  readonly correctingVersion: number | null;
  readonly dirty: boolean;
  readonly onCancelCorrection: () => void;
  readonly onSave: () => void;
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
  saving,
}: PromptEditorActionsProps) {
  const correcting = correctingVersion !== null;
  const saveLabel = correcting
    ? `Overwrite v${correctingVersion}`
    : "Save version";

  return (
    <ActionCluster>
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

      <ActionTooltip label={saveLabel} metaShortcut="enter">
        <Button
          aria-label={saveLabel}
          disabled={!dirty || saving}
          onClick={onSave}
          size="icon-round"
          variant="subtle"
        >
          {saving ? (
            <SpinnerGapIcon className="animate-spin" />
          ) : (
            <ArrowUpIcon weight="bold" />
          )}
        </Button>
      </ActionTooltip>
    </ActionCluster>
  );
}
