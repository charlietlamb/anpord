import { Button } from "@anpord/ui/components/button";
import { Badge } from "@anpord/ui/components/ui/badge";
import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { ShortcutButton } from "@anpord/ui/components/ui/shortcut-button";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { ArrowUpIcon, SpinnerGapIcon } from "@phosphor-icons/react";

interface PromptEditorHeaderProps {
  /** Set while a past version is being rewritten rather than branched from. */
  readonly correctingVersion: number | null;
  readonly dirty: boolean;
  readonly name: string;
  readonly onCancelCorrection: () => void;
  readonly onEditDetails: () => void;
  readonly onSave: () => void;
  readonly promptId: string;
  readonly saving: boolean;
  readonly viewingVersion: number | null;
}

export function PromptEditorHeader({
  correctingVersion,
  dirty,
  name,
  onCancelCorrection,
  onEditDetails,
  onSave,
  promptId,
  saving,
  viewingVersion,
}: PromptEditorHeaderProps) {
  return (
    <header className="flex w-full shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border-surface bg-sidebar-accent px-4 py-3 shadow-raised">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="min-w-0 truncate font-heading text-xl tracking-[-0.02em]">
          {name}
        </h1>
        <CopyableId className="shrink-0" value={promptId} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {correctingVersion === null ? null : (
          <Badge size="sm" variant="secondary">
            Overwriting v{correctingVersion}
          </Badge>
        )}
        {viewingVersion === null || correctingVersion !== null ? null : (
          <Badge size="sm" variant="secondary">
            Viewing v{viewingVersion}
          </Badge>
        )}
        {dirty ? (
          <StatusBadge tone="pending">Unsaved changes</StatusBadge>
        ) : null}
        {correctingVersion === null ? (
          <Button onClick={onEditDetails} size="sm" variant="outline">
            Edit details
          </Button>
        ) : (
          <Button onClick={onCancelCorrection} size="sm" variant="outline">
            Cancel
          </Button>
        )}
        <ShortcutButton
          className="h-[1.875rem]"
          disabled={!dirty || saving}
          metaShortcut="enter"
          onClick={onSave}
          size="sm"
        >
          {saving ? (
            <SpinnerGapIcon className="animate-spin" size={15} />
          ) : (
            <ArrowUpIcon size={15} weight="bold" />
          )}
          {correctingVersion === null
            ? "Save version"
            : `Overwrite v${correctingVersion}`}
        </ShortcutButton>
      </div>
    </header>
  );
}
