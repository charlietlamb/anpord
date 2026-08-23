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
  readonly correctingVersion: number | null;
  readonly dirty: boolean;
  readonly onCancelCorrection: () => void;
  readonly onSave: () => void;

  readonly promptId: string;
  readonly saving: boolean;
}

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

      <ShortcutButton
        className={cn(
          "h-8 shrink-0 rounded-full px-3.5 transition-surface",
          armed ? undefined : "disabled:opacity-100"
        )}
        disabled={!armed}
        metaShortcut="enter"
        onClick={onSave}
        size="sm"
        variant={armed ? "default" : "subtle"}
      >
        {saving ? (
          <SpinnerGapIcon className="animate-spin" size={15} />
        ) : (
          <ArrowUpIcon size={15} />
        )}
        {saveLabel}
      </ShortcutButton>
    </ActionCluster>
  );
}
