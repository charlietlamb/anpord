import { Button } from "@anpord/ui/components/button";
import {
  ActionCluster,
  ActionGroup,
} from "@anpord/ui/components/ui/action-cluster";
import { ActionTooltip } from "@anpord/ui/components/ui/action-tooltip";
import {
  ArrowUpIcon,
  PencilSimpleIcon,
  SpinnerGapIcon,
  XIcon,
} from "@phosphor-icons/react";

interface PromptEditorActionsProps {
  /** Set while a past version is being rewritten rather than branched from. */
  readonly correctingVersion: number | null;
  readonly dirty: boolean;
  readonly onCancelCorrection: () => void;
  readonly onEditDetails: () => void;
  readonly onSave: () => void;
  readonly saving: boolean;
}

/**
 * What can be done to the prompt, floated at the top of the page. The actions
 * stay put while the prompt scrolls under them, so saving never depends on
 * finding your way back to the top of a long document.
 */
export function PromptEditorActions({
  correctingVersion,
  dirty,
  onCancelCorrection,
  onEditDetails,
  onSave,
  saving,
}: PromptEditorActionsProps) {
  const correcting = correctingVersion !== null;
  const saveLabel = correcting
    ? `Overwrite v${correctingVersion}`
    : "Save version";
  const editLabel = correcting ? "Cancel correction" : "Edit details";

  return (
    <ActionCluster>
      <ActionGroup>
        <ActionTooltip label={editLabel}>
          <Button
            aria-label={editLabel}
            onClick={correcting ? onCancelCorrection : onEditDetails}
            size="icon-round"
            variant="subtle"
          >
            {correcting ? <XIcon /> : <PencilSimpleIcon />}
          </Button>
        </ActionTooltip>

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
      </ActionGroup>
    </ActionCluster>
  );
}
