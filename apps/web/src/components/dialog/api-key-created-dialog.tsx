import { Button } from "@anpord/ui/components/button";
import { BaseDialog } from "@anpord/ui/components/dialog/base-dialog";
import { CodeBlock } from "@anpord/ui/components/ui/code-block";
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
      <CodeBlock className="whitespace-pre-wrap break-all" copyValue={apiKey}>
        {apiKey}
      </CodeBlock>

      <Button onClick={close}>I've saved it</Button>
    </BaseDialog>
  );
}
