import { FormDialog } from "@anpord/ui/components/dialog/form-dialog";
import { ColorPicker } from "@anpord/ui/components/ui/color-picker";
import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import type { ChannelColor } from "@anpord/ui/lib/channel-colors";
import { CHANNEL_DEFAULT_COLOR } from "@anpord/ui/lib/channel-colors";
import { z } from "zod";
import { useDialog, useDialogOpen } from "@/lib/dialog/dialogs";

/** Mirrors ChannelName, so a name the API would refuse is caught in the form
 * rather than as a failed request. */
const channelSchema = z.object({
  color: z.string(),
  name: z
    .string()
    .min(1)
    .max(36)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, "Lowercase letters, numbers, - and _ only"),
});

interface ChannelDialogProps {
  readonly color?: ChannelColor;
  /** Absent when creating, which is what tells the dialog which act it is. */
  readonly name?: string;
  readonly onSubmit: (value: { color: ChannelColor; name: string }) => void;
}

export function ChannelDialog({ color, name, onSubmit }: ChannelDialogProps) {
  const { close } = useDialog();
  const open = useDialogOpen("channel");
  const editing = name !== undefined;

  const form = useAppForm({
    defaultValues: {
      color: (color ?? CHANNEL_DEFAULT_COLOR) as string,
      name: name ?? "",
    },
    onSubmit: ({ value }) => {
      onSubmit({ color: value.color as ChannelColor, name: value.name });
      close();
    },
    validators: { onChange: channelSchema },
  });

  return (
    <FormDialog
      description={
        editing
          ? "The colour identifies this channel everywhere it appears."
          : "Channels address a version, so callers ask for a channel rather than a number."
      }
      onClose={close}
      onSubmit={form.handleSubmit}
      open={open}
      title={editing ? "Edit channel" : "New channel"}
    >
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <form.AppField name="name">
            {(field) => <field.TextField label="Name" placeholder="staging" />}
          </form.AppField>
        </div>
        <form.AppField name="color">
          {(field) => (
            <ColorPicker
              onChange={(next) => field.handleChange(next)}
              value={field.state.value as ChannelColor}
            />
          )}
        </form.AppField>
      </div>
      <form.AppForm>
        <form.SubmitButton
          label={editing ? "Save channel" : "Create channel"}
          loadingLabel="Saving…"
        />
      </form.AppForm>
    </FormDialog>
  );
}
