import { FormDialog } from "@anpord/ui/components/dialog/form-dialog";
import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { z } from "zod";
import { useDialog, useDialogOpen } from "@/lib/dialog/dialogs";

const keySchema = z.object({ name: z.string().min(1).max(64) });

interface NewApiKeyDialogProps {
  readonly onSubmit: (name: string) => void;
}

export function NewApiKeyDialog({ onSubmit }: NewApiKeyDialogProps) {
  const { close } = useDialog();
  const open = useDialogOpen("newApiKey");

  const form = useAppForm({
    defaultValues: { name: "" },
    onSubmit: ({ value }) => {
      onSubmit(value.name);
      close();
    },
    validators: { onChange: keySchema },
  });

  return (
    <FormDialog
      description="The name is how you'll recognise this key when revoking it."
      onClose={close}
      onSubmit={form.handleSubmit}
      open={open}
      title="New API key"
    >
      <form.AppField name="name">
        {(field) => <field.TextField label="Name" placeholder="CI" />}
      </form.AppField>
      <form.AppForm>
        <form.SubmitButton label="Create key" loadingLabel="Creating…" />
      </form.AppForm>
    </FormDialog>
  );
}
