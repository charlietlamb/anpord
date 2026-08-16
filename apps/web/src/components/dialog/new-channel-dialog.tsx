import { FormDialog } from "@anpord/ui/components/dialog/form-dialog";
import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { z } from "zod";
import { useDialog, useDialogOpen } from "@/lib/dialog/dialogs";

/** Mirrors ChannelName, so a name the API would refuse is caught in the form. */
const channelSchema = z.object({
  channel: z
    .string()
    .min(1)
    .max(36)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, "Lowercase letters, numbers, - and _ only"),
});

interface NewChannelDialogProps {
  readonly onSubmit: (channel: string) => void;
  readonly version: number;
}

export function NewChannelDialog({ onSubmit, version }: NewChannelDialogProps) {
  const { close } = useDialog();
  const open = useDialogOpen("newChannel");

  const form = useAppForm({
    defaultValues: { channel: "" },
    onSubmit: ({ value }) => {
      onSubmit(value.channel);
      close();
    },
    validators: { onChange: channelSchema },
  });

  return (
    <FormDialog
      description={`The channel is created pointing at v${version}.`}
      onClose={close}
      onSubmit={form.handleSubmit}
      open={open}
      title="New channel"
    >
      <form.AppField name="channel">
        {(field) => <field.TextField label="Name" placeholder="staging" />}
      </form.AppField>
      <form.AppForm>
        <form.SubmitButton label="Create channel" loadingLabel="Creating…" />
      </form.AppForm>
    </FormDialog>
  );
}
