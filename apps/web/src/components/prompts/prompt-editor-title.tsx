import { Badge } from "@anpord/ui/components/ui/badge";
import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";

interface PromptEditorTitleProps {
  /** Set while a past version is being rewritten rather than branched from. */
  readonly correctingVersion: number | null;
  readonly dirty: boolean;
  readonly name: string;
  readonly promptId: string;
  readonly viewingVersion: number | null;
}

/**
 * Names the prompt, at the top of the prompt rather than above the page. It
 * scrolls away with the first paragraph, the way a document's title does.
 */
export function PromptEditorTitle({
  correctingVersion,
  dirty,
  name,
  promptId,
  viewingVersion,
}: PromptEditorTitleProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
      <h1 className="min-w-0 shrink truncate font-heading text-2xl tracking-tight">
        {name}
      </h1>
      <CopyableId className="shrink-0" value={promptId} />

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
      {dirty ? <StatusBadge tone="pending">Unsaved changes</StatusBadge> : null}
    </div>
  );
}
