import { Button } from "@anpord/ui/components/button";
import { CopyButton } from "@anpord/ui/components/copy-button";
import { BaseDialog } from "@anpord/ui/components/dialog/base-dialog";
import { useDialog, useDialogOpen } from "@/lib/dialog/dialogs";

interface ApiKeyCreatedDialogProps {
  readonly apiKey: string;
  readonly name: string;
}

export function ApiKeyCreatedDialog({
  apiKey,
  name,
}: ApiKeyCreatedDialogProps) {
  const { close } = useDialog();
  const open = useDialogOpen("apiKeyCreated");

  return (
    <BaseDialog
      className="sm:max-w-md"
      description="Only its hash is stored, so this is the one time it can be read."
      onClose={close}
      open={open}
      title={`${name} is ready`}
    >
      <div className="flex items-center gap-2 rounded-lg border border-border-surface bg-muted px-3 py-2.5">
        <code className="min-w-0 flex-1 truncate font-mono text-[0.8125rem]">
          {apiKey}
        </code>
        <CopyButton
          className="size-7 shrink-0"
          label="Copy key"
          value={apiKey}
        />
      </div>

      <Button onClick={close}>I've saved it</Button>
    </BaseDialog>
  );
}
