import { Badge } from "@anpord/ui/components/ui/badge";
import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { ShortcutButton } from "@anpord/ui/components/ui/shortcut-button";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { ArrowUpIcon, SpinnerGapIcon } from "@phosphor-icons/react";

interface PromptEditorHeaderProps {
  readonly dirty: boolean;
  readonly name: string;
  readonly onSave: () => void;
  readonly promptId: string;
  readonly saving: boolean;
  readonly viewingVersion: number | null;
}

export function PromptEditorHeader({
  dirty,
  name,
  onSave,
  promptId,
  saving,
  viewingVersion,
}: PromptEditorHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-border border-b px-6 py-4 xl:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="min-w-0 truncate font-heading text-xl tracking-[-0.02em]">
          {name}
        </h1>
        <CopyableId className="shrink-0" value={promptId} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {viewingVersion === null ? null : (
          <Badge size="sm" variant="secondary">
            Viewing v{viewingVersion}
          </Badge>
        )}
        {dirty ? (
          <StatusBadge tone="pending">Unsaved changes</StatusBadge>
        ) : null}
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
          Save version
        </ShortcutButton>
      </div>
    </header>
  );
}
