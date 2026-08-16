import { FormDialog } from "@anpord/ui/components/dialog/form-dialog";
import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { z } from "zod";
import { useDialog, useDialogOpen } from "@/lib/dialog/dialogs";

/** Mirrors PromptId and PromptName, so a value the API would refuse is caught
 * in the form rather than as a failed request. */
const detailsSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^[a-z0-9][a-z0-9/_-]*$/,
      "Lowercase letters, numbers, /, - and _ only"
    ),
  name: z.string().min(1).max(255),
});

interface EditPromptDialogProps {
  readonly id: string;
  readonly name: string;
  readonly onSubmit: (details: { id: string; name: string }) => void;
}

export function EditPromptDialog({
  id,
  name,
  onSubmit,
}: EditPromptDialogProps) {
  const { close } = useDialog();
  const open = useDialogOpen("editPrompt");

  const form = useAppForm({
    defaultValues: { id, name },
    onSubmit: ({ value }) => {
      onSubmit(value);
      close();
    },
    validators: { onChange: detailsSchema },
  });

  return (
    <FormDialog
      description="The identifier is how callers ask for this prompt."
      onClose={close}
      onSubmit={form.handleSubmit}
      open={open}
      title="Edit details"
    >
      <form.AppField name="name">
        {(field) => (
          <field.TextField label="Name" placeholder="Support triage" />
        )}
      </form.AppField>
      <form.AppField name="id">
        {(field) => (
          <field.TextField label="Identifier" placeholder="support-triage" />
        )}
      </form.AppField>
      <form.AppForm>
        <form.SubmitButton label="Save details" loadingLabel="Saving…" />
      </form.AppForm>
    </FormDialog>
  );
}
