import { Badge } from "@anpord/ui/components/ui/badge";
import { CopyableId } from "@anpord/ui/components/ui/copyable-id";
import { InlineEdit } from "@anpord/ui/components/ui/inline-edit";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { toast } from "sonner";
import { useDebouncedSave } from "@/lib/query/use-debounced-save";
import { useUpdatePrompt } from "@/lib/query/use-update-prompt";

interface PromptEditorTitleProps {
  /** Set while a past version is being rewritten rather than branched from. */
  readonly correctingVersion: number | null;
  readonly dirty: boolean;
  readonly name: string;
  readonly promptId: string;
  readonly viewingVersion: number | null;
}

/**
 * Names the prompt, at the top of the prompt rather than above the page, and
 * renames it in place. The identifier sits beneath: it is what callers ask
 * for, so it is read and copied here and changed deliberately elsewhere.
 */
export function PromptEditorTitle({
  correctingVersion,
  dirty,
  name,
  promptId,
  viewingVersion,
}: PromptEditorTitleProps) {
  const rename = useUpdatePrompt(promptId);

  const title = useDebouncedSave({
    mutation: rename,
    onError: (error) =>
      toast.error("Couldn't rename the prompt", { description: error.message }),
    saved: name,
    toInput: (value: string) => ({ name: value }),
  });

  return (
    <div className="mb-5 flex flex-col gap-1">
      <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-2">
        <InlineEdit
          ariaLabel="Prompt name"
          className="flex-1 font-heading text-2xl tracking-tight"
          onBlur={title.flush}
          onCancel={title.reset}
          onChange={(value) => title.onChange(value)}
          placeholder="Untitled"
          value={title.value}
        />

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
      </div>

      <CopyableId className="self-start" value={promptId} />
    </div>
  );
}
