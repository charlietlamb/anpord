import { InlineEdit } from "@anpord/ui/components/ui/inline-edit";
import { StatusBadge } from "@anpord/ui/components/ui/status-badge";
import { EyeIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useDebouncedSave } from "@/lib/query/use-debounced-save";
import { useUpdatePrompt } from "@/lib/query/use-update-prompt";

interface PromptEditorTitleProps {
  /* Set while a past version is rewritten rather than branched from. */
  readonly correctingVersion: number | null;
  readonly dirty: boolean;
  readonly name: string;
  readonly promptId: string;
  readonly viewingVersion: number | null;
}

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
    <div className="mb-5 flex min-h-8 flex-wrap items-center gap-x-3 gap-y-2">
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
        <StatusBadge icon={PencilSimpleIcon}>
          Overwriting v{correctingVersion}
        </StatusBadge>
      )}
      {viewingVersion === null || correctingVersion !== null ? null : (
        <StatusBadge icon={EyeIcon}>Viewing v{viewingVersion}</StatusBadge>
      )}
      {dirty ? (
        <StatusBadge icon={PencilSimpleIcon} tone="pending">
          Unsaved changes
        </StatusBadge>
      ) : null}
    </div>
  );
}
